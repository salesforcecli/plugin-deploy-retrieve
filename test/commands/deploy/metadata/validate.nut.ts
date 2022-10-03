/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { DeployResultJson } from '../../../../src/utils/types';

describe('deploy metadata validate NUTs', () => {
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

  describe('--source-dir flag', () => {
    it('should validate deploy for force-app', async () => {
      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });
  });
});
