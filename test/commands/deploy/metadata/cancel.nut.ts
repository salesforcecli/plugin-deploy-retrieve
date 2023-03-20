/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { strict as assert } from 'node:assert';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson } from '../../../../src/utils/types';
import { CachedOptions } from '../../../../src/utils/deploy';

function readDeployCache(projectDir: string): Record<string, CachedOptions> {
  const contents = fs.readFileSync(path.join(projectDir, '.sf', 'deploy-cache.json'), 'utf-8');
  return JSON.parse(contents) as Record<string, CachedOptions>;
}

describe('deploy metadata cancel NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: { gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc' },
      scratchOrgs: [{ alias: 'test', setDefault: true, config: path.join('config', 'project-scratch-def.json') }],
      devhubAuthStrategy: 'AUTO',
    });
  });

  after(async () => {
    await session?.clean();
  });

  describe('--use-most-recent', () => {
    /**
     * This test runs differently by OS, presumably due to perf.  Typical:
     * linux:  the cancel reaches the server before the deploy finishes and cancel happens
     * windows:  the deploy finishes before the cancel is issued and the error condition happens
     */
    it('should cancel most recently started deployment', () => {
      const first = execCmd<DeployResultJson>('deploy:metadata --source-dir force-app --async --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(first);
      assert(first.id);

      const cacheBefore = readDeployCache(session.project.dir);
      expect(cacheBefore).to.have.property(first.id);

      const cancel = execCmd<DeployResultJson>('deploy:metadata:cancel --use-most-recent --json');
      assert(cancel.jsonOutput);
      if (cancel.jsonOutput.status === 0) {
        assert(cancel.jsonOutput.result);
        assertSuccessfulCancel(session.project.dir, first, cancel.jsonOutput.result);
      } else {
        // the deploy likely already finished
        expect(cancel.jsonOutput.exitCode).to.equal(1);
        expect(cancel.jsonOutput.name).to.equal('CannotCancelDeployError');
      }
    });
  });

  describe('--job-id', () => {
    it('should cancel the provided job id', () => {
      const first = execCmd<DeployResultJson>('deploy:metadata --source-dir force-app --async --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(first);
      assert(first.id);

      const cacheBefore = readDeployCache(session.project.dir);
      expect(cacheBefore).to.have.property(first.id);

      const cancel = execCmd<DeployResultJson>(`deploy:metadata:cancel --job-id ${first.id} --json`);
      assert(cancel.jsonOutput);

      if (cancel.jsonOutput.status === 0) {
        assert(cancel.jsonOutput.result);
        assertSuccessfulCancel(session.project.dir, first, cancel.jsonOutput.result);
      } else {
        // the deploy likely already finished
        expect(cancel.jsonOutput.exitCode).to.equal(1);
        expect(cancel.jsonOutput.name).to.equal('CannotCancelDeployError');
      }
    });
  });
});

const assertSuccessfulCancel = (dir: string, first: DeployResultJson, cancel: DeployResultJson) => {
  expect(cancel.status).to.equal('Canceled');
  expect(cancel.canceledBy).to.not.be.undefined;
  expect(cancel.canceledByName).to.not.be.undefined;
  expect(cancel.success).to.be.false;
  const cacheAfter = readDeployCache(dir);
  assert(first.id);
  expect(cacheAfter).to.have.property(first.id);
  expect(cacheAfter[first.id]).have.property('status');
  expect(cacheAfter[first.id].status).to.equal(RequestStatus.Canceled);
};
