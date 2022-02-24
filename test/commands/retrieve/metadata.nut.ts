/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';

describe('retrieve metadata NUTs', () => {
  let sourceTestkit: SourceTestkit;

  before(async () => {
    sourceTestkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      executable: path.join(process.cwd(), 'bin', 'dev'),
      nut: __filename,
    });
    await sourceTestkit.addTestFiles();
    await sourceTestkit.deploy({ args: '--source-dir force-app', exitCode: 0 });
  });

  after(async () => {
    await sourceTestkit?.clean();
  });

  describe('--source-dir flag', () => {
    it('should retrieve force-app', async () => {
      await sourceTestkit.retrieve({ args: '--source-dir force-app' });
      await sourceTestkit.expect.filesToBeRetrieved(['force-app/**/*'], ['force-app/test/**/*']);
    });
  });

  describe('--metadata flag', () => {
    it('should retrieve ApexClass', async () => {
      await sourceTestkit.retrieve({ args: '--metadata ApexClass' });
      await sourceTestkit.expect.filesToBeRetrieved(['force-app/main/default/classes/*']);
    });

    it('should retrieve named ApexClass', async () => {
      await sourceTestkit.retrieve({ args: '--metadata ApexClass:GeocodingService' });
      await sourceTestkit.expect.filesToBeRetrieved(['force-app/main/default/classes/GeocodingService.cls']);
    });

    it('should retrieve multiple metadata types', async () => {
      await sourceTestkit.retrieve({ args: '--metadata ApexClass AuraDefinitionBundle' });
      await sourceTestkit.expect.filesToBeRetrieved([
        'force-app/main/default/classes/*',
        'force-app/main/default/aura/**/*',
      ]);
    });
  });

  describe('--manifest flag', () => {
    it('should retrieve metadata specified in package.xml', async () => {
      const xml = '<types><members>*</members><name>ApexClass</name></types>';
      const packageXml = await sourceTestkit.createPackageXml(xml);

      await sourceTestkit.retrieve({ args: `--manifest ${packageXml}` });
      await sourceTestkit.expect.filesToBeRetrieved(['force-app/main/default/classes/*']);
    });
  });
});
