/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { expect } from 'chai';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson } from '../../../../src/utils/types';
import { CachedOptions } from '../../../../src/utils/deploy';

function readDeployCache(projectDir: string): Record<string, CachedOptions> {
  const contents = fs.readFileSync(path.join(projectDir, '.sf', 'deploy-cache.json'), 'utf-8');
  return JSON.parse(contents) as Record<string, CachedOptions>;
}

describe('deploy metadata resume NUTs', () => {
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
    it('should resume most recently started deployment', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });

      const cacheBefore = readDeployCache(testkit.projectDir);
      expect(cacheBefore).to.have.property(first.result.id);

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:resume', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });

      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);

      const cacheAfter = readDeployCache(testkit.projectDir);
      expect(cacheAfter).to.have.property(first.result.id);
      expect(cacheAfter[first.result.id]).have.property('status');
      expect(cacheAfter[first.result.id].status).to.equal(RequestStatus.Succeeded);
    });
  });

  describe('--job-id', () => {
    it('should resume the provided job id (18 chars)', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async --ignore-conflicts',
        json: true,
        exitCode: 0,
      });

      const cacheBefore = readDeployCache(testkit.projectDir);
      expect(cacheBefore).to.have.property(first.result.id);

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:resume', {
        args: `--job-id ${first.result.id}`,
        json: true,
        exitCode: 0,
      });

      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);

      const cacheAfter = readDeployCache(testkit.projectDir);
      expect(cacheAfter).to.have.property(first.result.id);
      expect(cacheAfter[first.result.id]).have.property('status');
      expect(cacheAfter[first.result.id].status).to.equal(RequestStatus.Succeeded);
    });

    it('should resume the provided job id (15 chars)', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async --ignore-conflicts',
        json: true,
        exitCode: 0,
      });

      const cacheBefore = readDeployCache(testkit.projectDir);
      expect(cacheBefore).to.have.property(first.result.id);

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:resume', {
        args: `--job-id ${first.result.id.substring(0, 15)}`,
        json: true,
        exitCode: 0,
      });

      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);

      const cacheAfter = readDeployCache(testkit.projectDir);
      expect(cacheAfter).to.have.property(first.result.id);
      expect(cacheAfter[first.result.id]).have.property('status');
      expect(cacheAfter[first.result.id].status).to.equal(RequestStatus.Succeeded);
    });
  });
});
