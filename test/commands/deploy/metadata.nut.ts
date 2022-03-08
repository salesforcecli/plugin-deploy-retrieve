/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { FileResponse } from '@salesforce/source-deploy-retrieve';

describe('deploy metadata NUTs', () => {
  let sourceTestkit: SourceTestkit;

  before(async () => {
    sourceTestkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      executable: path.join(process.cwd(), 'bin', 'dev'),
      nut: __filename,
    });
  });

  after(async () => {
    await sourceTestkit?.clean();
  });

  describe('--source-dir flag', () => {
    it('should deploy force-app', async () => {
      await sourceTestkit.deploy({ args: '--source-dir force-app' });
      await sourceTestkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });
  });

  describe('--metadata flag', () => {
    it('should deploy ApexClass', async () => {
      await sourceTestkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      await sourceTestkit.deploy({ args: '--metadata ApexClass' });
      await sourceTestkit.expect.filesToBeDeployed(['force-app/main/default/classes/*']);
    });

    it('should deploy named ApexClass', async () => {
      await sourceTestkit.modifyLocalGlobs(
        ['force-app/main/default/classes/GeocodingService.cls'],
        '// another comment'
      );
      await sourceTestkit.deploy({ args: '--metadata ApexClass:GeocodingService' });
      await sourceTestkit.expect.filesToBeDeployed(['force-app/main/default/classes/GeocodingService.cls']);
    });

    it('should deploy multiple metadata types', async () => {
      await sourceTestkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      await sourceTestkit.modifyLocalGlobs(['force-app/main/default/aura/**/*.cmp'], '<!-- comment -->');
      await sourceTestkit.deploy({ args: '--metadata ApexClass AuraDefinitionBundle' });
      await sourceTestkit.expect.filesToBeDeployed([
        'force-app/main/default/classes/*',
        'force-app/main/default/aura/**/*',
      ]);
    });
  });

  describe('--manifest flag', () => {
    it('should deploy metadata specified in package.xml', async () => {
      await sourceTestkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      const xml = '<types><members>*</members><name>ApexClass</name></types>';
      const packageXml = await sourceTestkit.createPackageXml(xml);

      await sourceTestkit.deploy({ args: `--manifest ${packageXml}` });
      await sourceTestkit.expect.filesToBeDeployed(['force-app/main/default/classes/*']);
    });
  });

  describe('--api flag', () => {
    it('should deploy force-app with SOAP API', async () => {
      await sourceTestkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      await sourceTestkit.modifyLocalGlobs(['force-app/main/default/aura/**/*.cmp'], '<!-- comment -->');
      await sourceTestkit.deploy({ args: '--metadata ApexClass AuraDefinitionBundle --api SOAP' });
      await sourceTestkit.expect.filesToBeDeployed([
        'force-app/main/default/classes/*',
        'force-app/main/default/aura/**/*',
      ]);
    });

    it('should deploy force-app with REST API', async () => {
      await sourceTestkit.modifyLocalGlobs(['force-app/main/default/classes/*.cls'], '// comment');
      await sourceTestkit.modifyLocalGlobs(['force-app/main/default/aura/**/*.cmp'], '<!-- comment -->');
      const deploy = await sourceTestkit.deploy<{ files: FileResponse[] }>({
        args: '--metadata ApexClass AuraDefinitionBundle --api REST',
      });
      await sourceTestkit.expect.filesToBeDeployedViaResult(
        ['force-app/main/default/classes/*', 'force-app/main/default/aura/**/*'],
        [],
        deploy.result.files
      );
    });
  });
});
