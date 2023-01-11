/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { assert } from 'chai';
import { DeployResultJson } from '../../../../src/utils/types';

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
      const validation = await testkit.execute<DeployResultJson>('deploy:metadata:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        validation.result.files
      );

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:quick', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });
  });

  describe('--job-id', () => {
    it('should deploy previously validated deployment', async () => {
      const validation = await testkit.execute<DeployResultJson>('deploy:metadata:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        validation.result.files
      );

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:quick', {
        args: `--job-id ${validation.result.id}`,
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });

    it('should fail to deploy previously deployed deployment', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(first);
      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:quick', {
        args: `--job-id ${first.result.id}`,
        json: true,
        exitCode: 1,
      });
      assert(deploy);
      testkit.expect.errorToHaveName(deploy, 'CannotQuickDeployError');
    });
  });
});
