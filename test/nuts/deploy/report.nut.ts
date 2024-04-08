/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
