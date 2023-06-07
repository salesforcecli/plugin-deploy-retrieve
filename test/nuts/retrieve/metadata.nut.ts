/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { exec } from 'shelljs';

const ELECTRON = { id: '04t6A000002zgKSQAY', name: 'ElectronBranding' };

describe('retrieve metadata NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      nut: __filename,
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
    it('should retrieve named ApexClass', async () => {
      await testkit.retrieve({ args: '--metadata ApexClass:GeocodingService' });
      await testkit.expect.filesToBeRetrieved(['force-app/main/default/classes/GeocodingService.cls']);
    });

    it('should retrieve multiple metadata types', async () => {
      await testkit.retrieve({ args: '--metadata ApexClass AuraDefinitionBundle' });
      await testkit.expect.filesToBeRetrieved(['force-app/main/default/classes/*', 'force-app/main/default/aura/**/*']);
    });

    it('should retrieve into the output-dir', async () => {
      await testkit.retrieve({ args: '--metadata ApexClass AuraDefinitionBundle --output-dir myOutput' });
      await testkit.expect.filesToBeRetrieved(['myOutput/classes/*', 'myOutput/aura/**/*']);
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
      exec(`sfdx force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, { silent: true });

      await testkit.retrieve({ args: `--package-name "${ELECTRON.name}"` });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name]);
    });

    it('should retrieve an installed package and directory', async () => {
      exec(`sfdx force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, { silent: true });

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
