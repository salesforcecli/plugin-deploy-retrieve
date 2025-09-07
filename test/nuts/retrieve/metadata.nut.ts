/*
 * Copyright 2025, Salesforce, Inc.
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

import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';
import { expect, config } from 'chai';
import { RetrieveResultJson } from '../../../src/utils/types.js';

config.truncateThreshold = 0;

const ELECTRON = { id: '04t6A000002zgKSQAY', name: 'ElectronBranding' };

describe('retrieve metadata NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      nut: fileURLToPath(import.meta.url),
    });
    await testkit.addTestFiles();
    await testkit.deploy({ args: '--source-dir force-app', exitCode: 0 });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--source-dir flag', () => {
    it('should retrieve force-app', async () => {
      await testkit.retrieve({ args: '--source-dir force-app' });
      await testkit.expect.filesToBeRetrieved(['force-app/**/*'], ['force-app/test/**/*']);
    });
  });

  describe('--metadata flag', () => {
    it('should retrieve ApexClass', async () => {
      await testkit.retrieve({ args: '--metadata ApexClass' });
      await testkit.expect.filesToBeRetrieved(['force-app/main/default/classes/*']);
    });

    it('should retrieve named ApexClass', async () => {
      await testkit.retrieve({ args: '--metadata ApexClass:GeocodingService' });
      await testkit.expect.filesToBeRetrieved(['force-app/main/default/classes/GeocodingService.cls']);
    });

    it('should retrieve named CustomField', async () => {
      await testkit.retrieve({ args: '--metadata CustomField:Broker__c.Email__c ' });
      await testkit.expect.filesToBeRetrieved([
        'force-app/main/default/objects/Broker__c/fields/Email__c.field-meta.xml',
      ]);
      expect(
        fs
          .readFileSync(
            path.join(
              testkit.projectDir,
              'force-app',
              'main',
              'default',
              'objects',
              'Broker__c',
              'Broker__c.object-meta.xml'
            ),
            'utf8'
          )
          .split('\n').length
        // 4 lines would be overwritten - ensures like W-15896939 is fixed
      ).to.be.greaterThanOrEqual(30);
    });

    it('should retrieve multiple metadata types', async () => {
      await testkit.retrieve({ args: '--metadata ApexClass AuraDefinitionBundle' });
      await testkit.expect.filesToBeRetrieved(['force-app/main/default/classes/*', 'force-app/main/default/aura/**/*']);
    });

    it('should retrieve into the output-dir', async () => {
      await testkit.retrieve({ args: '--metadata ApexClass AuraDefinitionBundle --output-dir myOutput' });
      await testkit.expect.filesToBeRetrieved(['myOutput/classes/*', 'myOutput/aura/**/*']);
    });

    it('should retrieve a single metadata file with correct path', async () => {
      const result = await testkit.retrieve({ args: '--metadata CustomTab:Broker__c --output-dir myOutput --json' });
      expect(result?.status).to.equal(0);
      const retrieveResult = result?.result as unknown as RetrieveResultJson;
      expect(retrieveResult.success).to.equal(true);
      expect(retrieveResult.files).to.be.an('array').with.lengthOf(1);
      expect(retrieveResult.files[0].filePath).to.equal(
        path.join(testkit.projectDir, 'myOutput', 'tabs', 'Broker__c.tab-meta.xml')
      );
    });

    it('should warn when nothing retrieved into output-dir and not throw ENOENT', async () => {
      const result = await testkit.retrieve({ args: '--metadata ApexClass:NonExistant --output-dir myOutput' });
      expect(result?.status).to.equal(0);
      const retrieveResult = result?.result as unknown as RetrieveResultJson;
      expect(retrieveResult.success).to.equal(true);
      expect(retrieveResult.fileProperties).to.be.an('array').with.lengthOf(1);
      expect(retrieveResult.messages).to.deep.equal([
        {
          fileName: 'unpackaged/package.xml',
          problem: "Entity of type 'ApexClass' named 'NonExistant' cannot be found",
        },
      ]);
    });

    it('should retrieve ApexClasses from wildcard match', async () => {
      const response = await testkit.retrieve({ args: '--metadata "ApexClass:Test*"' });
      expect(response?.status).to.equal(0);
      const result = response?.result as unknown as RetrieveResultJson;
      expect(result.success).to.be.true;
      expect(result.files.length).to.equal(4);
      result.files.forEach((f) => {
        expect(f.type).to.equal('ApexClass');
        expect(['TestSampleDataController', 'TestPropertyController']).to.include(f.fullName);
      });
      await testkit.expect.filesToBeRetrieved(['force-app/main/default/classes/Test*']);
    });

    it('should retrieve ApexClasses from wildcard match without already existing in the project', async () => {
      const forceAppDir = path.join(testkit.projectDir, 'force-app');
      const forceAppDirTmp = path.join(testkit.projectDir, 'force-app-tmp');

      try {
        fs.cpSync(forceAppDir, forceAppDirTmp, { recursive: true });
        fs.rmSync(forceAppDir, { recursive: true, force: true });
        expect(fs.existsSync(forceAppDir)).to.be.false;
        const defaultDir = path.join(forceAppDir, 'main', 'default');
        fs.mkdirSync(defaultDir, { recursive: true });

        const response = await testkit.retrieve({ args: '--metadata "ApexClass:Test*"' });
        expect(response?.status).to.equal(0);
        const result = response?.result as unknown as RetrieveResultJson;
        expect(result.success).to.be.true;
        expect(result.files.length).to.equal(4);
        result.files.forEach((f) => {
          expect(f.type).to.equal('ApexClass');
          expect(['TestSampleDataController', 'TestPropertyController']).to.include(f.fullName);
        });
        await testkit.expect.filesToBeRetrieved(['force-app/main/default/classes/Test*']);
      } finally {
        if (fs.existsSync(forceAppDirTmp)) {
          fs.cpSync(forceAppDirTmp, forceAppDir, { recursive: true });
          fs.rmSync(forceAppDirTmp, { recursive: true, force: true });
        }
      }
    });
  });

  describe('--manifest flag', () => {
    it('should retrieve metadata specified in package.xml', async () => {
      const xml = '<types><members>*</members><name>ApexClass</name></types>';
      const packageXml = await testkit.createPackageXml(xml);

      await testkit.retrieve({ args: `--manifest ${packageXml}` });
      await testkit.expect.filesToBeRetrieved(['force-app/main/default/classes/*']);
    });

    it('should retrieve metadata specified in package.xml to output-dir', async () => {
      const xml = '<types><members>*</members><name>ApexClass</name></types>';
      const packageXml = await testkit.createPackageXml(xml);

      await testkit.retrieve({ args: `--manifest ${packageXml} --output-dir myOutput` });
      await testkit.expect.filesToBeRetrieved(['myOutput/classes/*']);
    });
  });

  describe('--package-name flag', () => {
    it('should retrieve an installed package', async () => {
      execCmd(`force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, { silent: true, cli: 'sf' });

      await testkit.retrieve({ args: `--package-name "${ELECTRON.name}"` });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name]);
    });

    it('should retrieve an installed package and write to the output dir', async () => {
      await testkit.retrieve({ args: `--package-name "${ELECTRON.name}" --target-metadata-dir package-output` });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name]);
      expect(fs.existsSync(path.join(testkit.projectDir, 'package-output', 'unpackaged.zip'))).to.be.true;
    });

    it('should retrieve an installed package and write to the output dir (unzipped)', async () => {
      await testkit.retrieve({
        args: `--package-name "${ELECTRON.name}" --target-metadata-dir package-output1 --unzip`,
      });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name]);
      expect(
        fs.existsSync(
          path.join(
            testkit.projectDir,
            'package-output1',
            'unpackaged',
            'ElectronBranding',
            'lightningExperienceThemes',
            'Electron.lightningExperienceTheme'
          )
        )
      ).to.be.true;
    });

    it('should retrieve an installed package and directory', async () => {
      await testkit.retrieve({
        args: `--package-name "${ELECTRON.name}" --source-dir "${path.join(
          'force-app',
          'main',
          'default',
          'classes'
        )}"`,
      });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name]);
      await testkit.expect.filesToExist([
        `${ELECTRON.name}/**/brandingSets/*`,
        `${ELECTRON.name}/**/contentassets/*`,
        `${ELECTRON.name}/**/lightningExperienceThemes/*`,
      ]);
    });
  });

  describe('mdapi format', () => {
    it('should retrieve force-app into a specified directory', async () => {
      await testkit.retrieve({ args: '--source-dir force-app --target-metadata-dir metadata-dir' });
      await testkit.expect.directoryToHaveSomeFiles('metadata-dir');
      await testkit.expect.filesToBeRetrieved(['force-app/**/*'], ['force-app/test/**/*']);
    });

    it('should retrieve force-app into a specified directory with specified zip file name', async () => {
      await testkit.retrieve({
        args: '--source-dir force-app --target-metadata-dir metadata-dir --zip-file-name my-zip',
      });
      await testkit.expect.filesToBeRetrieved(['force-app/**/*'], ['force-app/test/**/*']);
      await testkit.expect.fileToExist(path.join('metadata-dir', 'my-zip.zip'));
    });

    it('should retrieve force-app into a specified directory and unzip', async () => {
      await testkit.retrieve({
        args: '--source-dir force-app --target-metadata-dir metadata-dir --unzip',
      });
      await testkit.expect.filesToBeRetrieved(['force-app/**/*'], ['force-app/test/**/*']);
      await testkit.expect.fileToExist(path.join('metadata-dir', 'unpackaged', 'unpackaged', 'package.xml'));
    });
  });
});
