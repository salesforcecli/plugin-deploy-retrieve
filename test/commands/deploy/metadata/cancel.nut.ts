/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { strict as assert } from 'node:assert';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson } from '../../../../src/utils/types.js';
import { CachedOptions } from '../../../../src/utils/deploy.js';

function readDeployCache(sessionDir: string): Record<string, CachedOptions> {
  const contents = fs.readFileSync(path.join(sessionDir, '.sf', 'deploy-cache.json'), 'utf-8');
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
      const first = execCmd<DeployResultJson>(
        'deploy:metadata --source-dir force-app --async --ignore-conflicts --json',
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      assert(first);
      assert(first.id);

      const cacheBefore = readDeployCache(session.dir);
      expect(cacheBefore).to.have.property(first.id);

      const cancel = execCmd<DeployResultJson>('deploy:metadata:cancel --use-most-recent --json');
      assert(cancel.jsonOutput);
      if (cancel.jsonOutput.status === 0) {
        assert(cancel.jsonOutput.result);
        assertSuccessfulCancel(session.dir, first, cancel.jsonOutput.result);
      } else {
        // the deploy likely already finished
        expect(cancel.jsonOutput.exitCode).to.equal(1);
        expect(cancel.jsonOutput.name).to.equal('CannotCancelDeployError');
      }
    });

    it.skip('should cancel most recently started deployment without specifying the flag', () => {
      const first = execCmd<DeployResultJson>(
        'deploy:metadata --source-dir force-app --async --ignore-conflicts --json',
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      assert(first);
      assert(first.id);

      const cacheBefore = readDeployCache(session.dir);
      expect(cacheBefore).to.have.property(first.id);

      const cancel = execCmd<DeployResultJson>('deploy:metadata:cancel --json');
      assert(cancel.jsonOutput);
      if (cancel.jsonOutput.status === 0) {
        assert(cancel.jsonOutput.result);
        assertSuccessfulCancel(session.dir, first, cancel.jsonOutput.result);
      } else {
        // the deploy likely already finished
        expect(cancel.jsonOutput.exitCode).to.equal(1);
        expect(cancel.jsonOutput.name).to.equal('CannotCancelDeployError');
      }
    });
  });

  describe('--job-id', () => {
    it('should cancel the provided job id', () => {
      const first = execCmd<DeployResultJson>(
        'deploy:metadata --source-dir force-app --async --ignore-conflicts --json',
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      assert(first);
      assert(first.id);

      const cacheBefore = readDeployCache(session.dir);
      expect(cacheBefore).to.have.property(first.id);

      const cancel = execCmd<DeployResultJson>(
        `deploy:metadata:cancel --job-id ${first.id} --target-org ${session.orgs.get('default')?.username} --json`
      );
      assert(cancel.jsonOutput);

      if (cancel.jsonOutput.status === 0) {
        assert(cancel.jsonOutput.result);
        assertSuccessfulCancel(session.dir, first, cancel.jsonOutput.result);
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
