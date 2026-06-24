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

import { join as pathJoin } from 'node:path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { type DeployResultJson } from '../../../src/utils/types.js';

const APEX_DIR = 'force-app/main/default/apex';

describe('Deploy/Retrieve --quiet and --no-progress', () => {
  let testkit: TestSession;

  before(async () => {
    testkit = await TestSession.create({
      project: { gitClone: 'https://github.com/salesforcecli/sample-project-multiple-packages' },
      scratchOrgs: [{ setDefault: true, config: pathJoin('config', 'project-scratch-def.json') }],
      devhubAuthStrategy: 'AUTO',
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('deploy start', () => {
    it('baseline prints streaming progress and the full success table', () => {
      const out = execCmd<DeployResultJson>(`project deploy start --source-dir ${APEX_DIR}`, {
        ensureExitCode: 0,
      }).shellOutput.stdout;
      expect(out).to.contain('Deploying Metadata');
      expect(out).to.contain('Deployed Source');
    });

    it('--no-progress suppresses streaming but keeps the full success table', () => {
      const out = execCmd<DeployResultJson>(`project deploy start --source-dir ${APEX_DIR} --no-progress`, {
        ensureExitCode: 0,
      }).shellOutput.stdout;
      expect(out, 'streaming should be suppressed').to.not.contain('Deploying Metadata');
      expect(out, 'full report should remain').to.contain('Deployed Source');
    });

    it('SF_DEPLOY_PROGRESS=false suppresses streaming without a flag', () => {
      const out = execCmd<DeployResultJson>(`project deploy start --source-dir ${APEX_DIR}`, {
        ensureExitCode: 0,
        env: { ...process.env, SF_DEPLOY_PROGRESS: 'false' },
      }).shellOutput.stdout;
      expect(out).to.not.contain('Deploying Metadata');
      expect(out).to.contain('Deployed Source');
    });

    it('--quiet prints a one-line summary and no streaming or table', () => {
      const out = execCmd<DeployResultJson>(`project deploy start --source-dir ${APEX_DIR} --quiet`, {
        ensureExitCode: 0,
      }).shellOutput.stdout;
      expect(out).to.match(/Deployed \d+\/\d+ components to .+ \(Deploy ID .+\)\./);
      expect(out, 'streaming should be suppressed').to.not.contain('Deploying Metadata');
      expect(out, 'success table should be collapsed').to.not.contain('Deployed Source');
    });

    it('--quiet composes with --json to return the trimmed (concise-equivalent) payload', () => {
      const json = execCmd<DeployResultJson>(`project deploy start --source-dir ${APEX_DIR} --quiet --json`, {
        ensureExitCode: 0,
      }).jsonOutput;
      // a fully-successful deploy returns no files under the trimmed payload
      expect(json?.result.files).to.deep.equal([]);
    });

    it('--quiet and --concise are mutually exclusive', () => {
      const err = execCmd<DeployResultJson>(`project deploy start --source-dir ${APEX_DIR} --quiet --concise`, {
        ensureExitCode: 2,
      }).shellOutput.stderr;
      expect(err).to.match(/cannot also be provided|exclusive/i);
    });
  });

  describe('deploy validate', () => {
    it('--quiet uses "Validated" wording', () => {
      const out = execCmd<DeployResultJson>(
        `project deploy validate --source-dir ${APEX_DIR} --test-level RunLocalTests --quiet`,
        { ensureExitCode: 0 }
      ).shellOutput.stdout;
      expect(out).to.match(/Validated \d+\/\d+ components to .+/);
      expect(out).to.not.contain('Deploying Metadata');
    });
  });

  describe('retrieve start', () => {
    it('--quiet prints a one-line retrieve summary', () => {
      const out = execCmd<DeployResultJson>(`project retrieve start --source-dir ${APEX_DIR} --quiet`, {
        ensureExitCode: 0,
      }).shellOutput.stdout;
      expect(out).to.match(/Retrieved \d+ files from .+\./);
    });
  });

  describe('out-of-scope guard', () => {
    it('deploy preview does not accept --quiet', () => {
      const err = execCmd<DeployResultJson>(`project deploy preview --source-dir ${APEX_DIR} --quiet`, {
        ensureExitCode: 2,
      }).shellOutput.stderr;
      expect(err).to.match(/Nonexistent flag|Unexpected argument|--quiet/i);
    });
  });
});
