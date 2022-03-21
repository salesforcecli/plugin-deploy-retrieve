/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { FileResponse } from '@salesforce/source-deploy-retrieve';

describe.only('deploy metadata quick NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      executable: path.join(process.cwd(), 'bin', 'dev'),
      nut: __filename,
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--use-most-recent', () => {
    it('should deploy previously validated deployment', async () => {
      const validation = await testkit.execute<{ jobId: string; files: FileResponse[] }>('deploy:metadata:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        validation.result.files
      );

      const deploy = await testkit.execute<{ jobId: string; files: FileResponse[] }>('deploy:metadata:quick', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });

      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });
  });

  describe('--job-id', () => {
    it('should deploy previously validated deployment', async () => {
      const validation = await testkit.execute<{ jobId: string; files: FileResponse[] }>('deploy:metadata:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        validation.result.files
      );

      const deploy = await testkit.execute<{ jobId: string; files: FileResponse[] }>('deploy:metadata:quick', {
        args: `--job-id ${validation.result.jobId}`,
        json: true,
        exitCode: 0,
      });

      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });

    it('should fail to deploy previously deployed deployment', async () => {
      const first = await testkit.execute<{ jobId: string; files: FileResponse[] }>('deploy:metadata', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });

      const deploy = await testkit.execute<{ jobId: string; files: FileResponse[] }>('deploy:metadata:quick', {
        args: `--job-id ${first.result.jobId}`,
        json: true,
        exitCode: 1,
      });

      testkit.expect.errorToHaveName(deploy, 'CannotQuickDeployError');
    });
  });
});
