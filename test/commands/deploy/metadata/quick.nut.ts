/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { assert, config } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { DeployResultJson } from '../../../../src/utils/types.js';
config.truncateThreshold = 0;

describe('deploy metadata quick NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: __filename,
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--use-most-recent', () => {
    it('should deploy previously validated deployment', async () => {
      const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });

    it.skip('should deploy previously validated deployment without specifying the flag', async () => {
      const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });
    it('should deploy previously validated deployment with metadata format', async () => {
      execCmd('project:convert:source --source-dir force-app --output-dir metadata');
      const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--metadata-dir metadata',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });
  });

  describe('--job-id', () => {
    it('should deploy previously validated deployment', async () => {
      const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
        args: `--job-id ${validation.result.id}`,
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });

    it('should fail to deploy previously deployed deployment', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(first);
      const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
        args: `--job-id ${first.result.id}`,
        json: true,
        exitCode: 1,
      });
      assert(deploy);
      testkit.expect.errorToHaveName(deploy, 'CannotQuickDeployError');
    });
  });
});
