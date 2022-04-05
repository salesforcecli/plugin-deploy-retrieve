/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { DeployResultJson } from '../../../../src/utils/types';

describe('deploy metadata report NUTs', () => {
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
    it('should report most recently started deployment', async () => {
      await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:report', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });

      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });
  });

  describe('--job-id', () => {
    it('should report the provided job id', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:report', {
        args: `--job-id ${first.result.id}`,
        json: true,
        exitCode: 0,
      });

      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });
  });
});
