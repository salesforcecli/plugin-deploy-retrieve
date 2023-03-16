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

describe('deploy metadata cancel NUTs', () => {
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
    /**
     * This test runs differently by OS, presumably due to perf.  Typical:
     * linux:  the cancel reaches the server before the deploy finishes and cancel happens
     * windows:  the deploy finishes before the cancel is issued and the error condition happens
     */
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
      });

      if (cancel?.status === 0) {
        assertSuccessfulCancel(testkit, first.result, cancel.result);
      } else {
        // the deploy likely already finished
        expect(cancel?.status).to.equal(1);
        expect(cancel?.name).to.equal('CannotCancelDeployError');
      }
    });
  });

  describe('--job-id', () => {
    it('should cancel the provided job id', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        // ignore conflicts so that if the first deploy failed to cancel, we don't get errors from conflicts
        args: '--source-dir force-app --async --ignore-conflicts',
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
      });
      assert(cancel);

      if (cancel.status === 0) {
        assertSuccessfulCancel(testkit, first.result, cancel.result);
      } else {
        // the deploy likely already finished
        expect(cancel?.status).to.equal(1);
        expect(cancel?.name).to.equal('CannotCancelDeployError');
      }
    });
  });
});

const assertSuccessfulCancel = (testkit: SourceTestkit, first: DeployResultJson, cancel: DeployResultJson) => {
  expect(cancel.status).to.equal('Canceled');
  expect(cancel.canceledBy).to.not.be.undefined;
  expect(cancel.canceledByName).to.not.be.undefined;
  expect(cancel.success).to.be.false;
  const cacheAfter = readDeployCache(testkit.projectDir);
  assert(first.id);
  expect(cacheAfter).to.have.property(first.id);
  expect(cacheAfter[first.id]).have.property('status');
  expect(cacheAfter[first.id].status).to.equal(RequestStatus.Canceled);
};
