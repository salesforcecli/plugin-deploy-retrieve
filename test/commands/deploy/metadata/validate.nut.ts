/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { FileResponse } from '@salesforce/source-deploy-retrieve';

describe('deploy metadata quick NUTs', () => {
  let sourceTestkit: SourceTestkit;

  before(async () => {
    sourceTestkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      executable: path.join(process.cwd(), 'bin', 'dev'),
      nut: __filename,
    });
  });

  after(async () => {
    await sourceTestkit?.clean();
  });

  describe('--source-dir flag', () => {
    it('should deploy force-app', async () => {
      const deploy = await sourceTestkit.execute<{ id: string; files: FileResponse[] }>('deploy:metadata:quick', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      await sourceTestkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        deploy.result.files
      );
    });
  });
});
