/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { strict as assert } from 'node:assert';
import { SourceTestkit } from '@salesforce/source-testkit';
import { expect } from 'chai';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson } from '../../../../src/utils/types';
import { CachedOptions } from '../../../../src/utils/deploy';

function readDeployCache(projectDir: string): Record<string, CachedOptions> {
  const contents = fs.readFileSync(path.join(projectDir, '.sf', 'deploy-cache.json'), 'utf-8');
  return JSON.parse(contents) as Record<string, CachedOptions>;
}

describe.only('deploy metadata cancel NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      nut: __filename,
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--use-most-recent', () => {
    it('should cancel most recently started deployment', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });
      assert(first);
      assert(first.result.id);

      const cacheBefore = readDeployCache(testkit.projectDir);
      expect(cacheBefore).to.have.property(first.result.id);

      const cancel = await testkit.execute<DeployResultJson>('deploy:metadata:cancel', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });

      if (cancel?.status === 0) {
        // successful cancel
        expect(cancel.result.status).to.equal('Canceled');
        expect(cancel.result.canceledBy).to.not.be.undefined;
        expect(cancel.result.canceledByName).to.not.be.undefined;
        expect(cancel.result.success).to.be.false;
      } else {
        // the deploy likely already finished
        expect(cancel?.status).to.equal(1);
        expect(cancel?.name).to.equal('CancelFailed');
        expect(cancel?.message).to.include('Deployment already completed');
      }

      const cacheAfter = readDeployCache(testkit.projectDir);
      expect(cacheAfter).to.have.property(first.result.id);
      expect(cacheAfter[first.result.id]).have.property('status');

      expect(cacheAfter[first.result.id].status).to.equal(RequestStatus.Canceled);
    });
  });

  describe('--job-id', () => {
    it('should cancel the provided job id', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });
      assert(first);
      assert(first.result.id);

      const cacheBefore = readDeployCache(testkit.projectDir);
      expect(cacheBefore).to.have.property(first.result.id);

      const cancel = await testkit.execute<DeployResultJson>('deploy:metadata:cancel', {
        args: `--job-id ${first.result.id}`,
        json: true,
        exitCode: 0,
      });
      assert(cancel);

      if (cancel.status === 0) {
        // successful cancel
        expect(cancel.result.status).to.equal('Canceled');
        expect(cancel.result.canceledBy).to.not.be.undefined;
        expect(cancel.result.canceledByName).to.not.be.undefined;
        expect(cancel.result.success).to.be.false;
      } else {
        // the deploy likely already finished
        expect(cancel.status).to.equal(1);
        expect(cancel.name).to.equal('CancelFailed');
        expect(cancel.message).to.include('Deployment already completed');
      }

      const cacheAfter = readDeployCache(testkit.projectDir);
      expect(cacheAfter).to.have.property(first.result.id);
      expect(cacheAfter[first.result.id]).have.property('status');
      expect(cacheAfter[first.result.id].status).to.equal(RequestStatus.Canceled);
    });
  });
});
