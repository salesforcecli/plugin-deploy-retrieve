/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { writeJson } from 'fs-extra';
import { TestLevel } from '../../src/utils/types';
import { MetadataDeployer } from '../../src/utils/metadataDeployer';

describe('deploy NUTs', () => {
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

  describe('deploy-options.json', () => {
    it('should deploy force-app', async () => {
      const deployOptions = {
        [MetadataDeployer.NAME]: {
          testLevel: TestLevel.NoTestRun,
          username: sourceTestkit.username,
          apps: ['force-app'],
        },
      };
      await writeJson(path.join(sourceTestkit.projectDir, 'deploy-options.json'), deployOptions);
      await sourceTestkit.execute('deploy', { json: false });
      await sourceTestkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });
  });
});
