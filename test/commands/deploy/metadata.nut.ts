/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { FileResponse } from '@salesforce/source-deploy-retrieve';

describe('deploy metadata NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      executable: path.join(process.cwd(), 'bin', 'dev'),
      nut: __filename,
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
      await testkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      await testkit.deploy({ args: '--metadata ApexClass' });
      await testkit.expect.filesToBeDeployed(['force-app/main/default/classes/*']);
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
