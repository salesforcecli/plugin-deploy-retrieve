/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { SourceTestkit } from '@salesforce/source-testkit';
import { expect } from 'chai';

async function getAllFilePaths(dir: string): Promise<string[]> {
  let filePaths: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isFile()) {
      filePaths.push(fullPath);
    } else if (entry.isDirectory()) {
      // eslint-disable-next-line no-await-in-loop
      filePaths = filePaths.concat(await getAllFilePaths(fullPath));
    }
  }
  return filePaths;
}

describe('deploy metadata NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      nut: fileURLToPath(import.meta.url),
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--source-dir flag', () => {
    it('should deploy force-app', async () => {
      await testkit.deploy({ args: '--source-dir force-app' });
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });
  });

  describe('--metadata flag', () => {
    it('should deploy ApexClass', async () => {
      process.env.SF_MDAPI_TEMP_DIR = 'myTempDirectory';
      await testkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      await testkit.deploy({ args: '--metadata ApexClass' });
      await testkit.expect.filesToBeDeployed(['force-app/main/default/classes/*']);

      // no illegal file paths should be generated when using SF_MDAPI_TEMP_DIR
      // Users/william.ruemmele/projects/oss/plugin-deploy-retrieve/test_session_1761066173823d94ce455705e3fe5/dreamhouse-lwc/myTempDirectory/2025-10-21T17_03_52.245Z_deploy/metadata/package.xml
      expect(
        (await getAllFilePaths(join(testkit.projectDir, process.env.SF_MDAPI_TEMP_DIR))).every((path) =>
          /[<>:"/\\|?*]/.test(path)
        )
      ).to.be.true;

      delete process.env.SF_MDAPI_TEMP_DIR;
    });

    it('should deploy named ApexClass', async () => {
      await testkit.modifyLocalGlobs(['force-app/main/default/classes/GeocodingService.cls'], '// another comment');
      await testkit.deploy({ args: '--metadata ApexClass:GeocodingService' });
      await testkit.expect.filesToBeDeployed(['force-app/main/default/classes/GeocodingService.cls']);
    });

    it('should deploy multiple metadata types', async () => {
      await testkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      await testkit.modifyLocalGlobs(['force-app/main/default/aura/**/*.cmp'], '<!-- comment -->');
      await testkit.deploy({ args: '--metadata ApexClass AuraDefinitionBundle' });
      await testkit.expect.filesToBeDeployed(['force-app/main/default/classes/*', 'force-app/main/default/aura/**/*']);
    });
  });

  describe('--manifest flag', () => {
    it('should deploy metadata specified in package.xml', async () => {
      await testkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      const xml = '<types><members>*</members><name>ApexClass</name></types>';
      const packageXml = await testkit.createPackageXml(xml);

      await testkit.deploy({ args: `--manifest ${packageXml}` });
      await testkit.expect.filesToBeDeployed(['force-app/main/default/classes/*']);
    });
  });
});
