/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { strict as assert } from 'node:assert';
import { SourceTestkit } from '@salesforce/source-testkit';
import { expect } from 'chai';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson, isSdrSuccess } from '../../../../src/utils/types.js';
import { CachedOptions } from '../../../../src/utils/deploy.js';

function readDeployCache(projectDir: string): Record<string, CachedOptions> {
  // source-testkit doesn't expose the session, so we'll go up 1 level from the project to get to it
  const contents = fs.readFileSync(path.join(path.dirname(projectDir), '.sf', 'deploy-cache.json'), 'utf-8');
  return JSON.parse(contents) as Record<string, CachedOptions>;
}

describe('[project deploy resume] NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: fileURLToPath(import.meta.url),
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--use-most-recent', () => {
    it('should resume most recently started deployment', async () => {
      const first = await testkit.execute<DeployResultJson>('project deploy start', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });
      assert(first);
      assert(first.result.id);

      const cacheBefore = readDeployCache(testkit.projectDir);
      expect(cacheBefore).to.have.property(first.result.id);

      const deploy = await testkit.execute<DeployResultJson>('project deploy resume', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        deploy.result.files.filter(isSdrSuccess)
      );

      const cacheAfter = readDeployCache(testkit.projectDir);

      expect(cacheAfter).to.have.property(first.result.id);
      expect(cacheAfter[first.result.id]).have.property('status');
      expect(cacheAfter[first.result.id].status).to.equal(RequestStatus.Succeeded);
    });
  });

  describe('--job-id', () => {
    let deployId: string;

    it('should resume the provided job id (18 chars)', async () => {
      const first = await testkit.execute<DeployResultJson>('project deploy start', {
        args: '--source-dir force-app --async --ignore-conflicts',
        json: true,
        exitCode: 0,
      });
      assert(first);
      assert(first.result.id);
      deployId = first.result.id;

      const cacheBefore = readDeployCache(testkit.projectDir);
      expect(cacheBefore).to.have.property(deployId);

      const deploy = await testkit.execute<DeployResultJson>('project deploy resume', {
        args: `--job-id ${deployId}`,
        json: true,
        exitCode: 0,
      });
      assert(deploy);

      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        deploy.result.files.filter(isSdrSuccess)
      );
      const cacheAfter = readDeployCache(testkit.projectDir);
      expect(cacheAfter).to.have.property(deployId);
      expect(cacheAfter[deployId]).have.property('status');
      expect(cacheAfter[deployId].status).to.equal(RequestStatus.Succeeded);
    });

    it('should resume a completed deploy by displaying results', async () => {
      const deploy = await testkit.execute<DeployResultJson>('project deploy resume', {
        args: `--job-id ${deployId}`,
        json: true,
        exitCode: 0,
      });
      assert(deploy);
    });

    it('should resume the provided job id (15 chars)', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async --ignore-conflicts',
        json: true,
        exitCode: 0,
      });
      assert(first);
      assert(first.result.id);

      const cacheBefore = readDeployCache(testkit.projectDir);
      expect(cacheBefore).to.have.property(first.result.id);

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:resume', {
        args: `--job-id ${first.result.id.substring(0, 15)}`,
        json: true,
        exitCode: 0,
      });
      assert(deploy);

      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        deploy.result.files.filter(isSdrSuccess)
      );

      const cacheAfter = readDeployCache(testkit.projectDir);
      expect(cacheAfter).to.have.property(first.result.id);
      expect(cacheAfter[first.result.id]).have.property('status');
      expect(cacheAfter[first.result.id].status).to.equal(RequestStatus.Succeeded);
    });
  });
});
