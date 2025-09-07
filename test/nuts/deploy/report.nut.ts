/*
 * Copyright 2025, Salesforce, Inc.
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

import * as path from 'node:path';
import { assert, expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { DeployResultJson } from '../../../src/utils/types.js';

describe('project deploy report', () => {
  let testkit: TestSession;

  before(async () => {
    testkit = await TestSession.create({
      project: { gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc' },
      scratchOrgs: [{ setDefault: true, config: path.join('config', 'project-scratch-def.json') }],
      devhubAuthStrategy: 'AUTO',
    });
    execCmd<DeployResultJson>('project deploy start', {
      ensureExitCode: 0,
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  it('can validate / deploy quick / report', () => {
    const validate = execCmd<DeployResultJson>('project deploy validate --metadata ApexClass --json', {
      ensureExitCode: 0,
    }).jsonOutput;
    assert(validate);
    expect(validate.result.checkOnly).to.be.true;
    expect(validate.result.done).to.be.true;
    expect(validate.result.success).to.be.true;
    const validateId = validate.result.id;

    const quick = execCmd<DeployResultJson>(`project deploy quick --job-id ${validateId} --json`, {
      ensureExitCode: 0,
    }).jsonOutput;
    assert(quick);
    expect(quick.result.checkOnly).to.be.false;
    expect(quick.result.done).to.be.true;
    expect(quick.result.success).to.be.true;
    const quickId = quick.result.id;

    const report = execCmd<DeployResultJson>(`project deploy report --job-id ${quickId} --json`, {
      ensureExitCode: 0,
    }).jsonOutput;
    assert(report);
    expect(report.result.checkOnly).to.be.false;
    expect(report.result.done).to.be.true;
    expect(report.result.success).to.be.true;
  });
});
