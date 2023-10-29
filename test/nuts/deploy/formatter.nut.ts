/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import { EOL } from 'node:os';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { DeployResultJson } from '../../../src/utils/types';

describe('Deploy Formatter', () => {
  let testkit: TestSession;

  before(async () => {
    testkit = await TestSession.create({
      project: { gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc' },
      scratchOrgs: [{ setDefault: true, config: path.join('config', 'project-scratch-def.json') }],
      devhubAuthStrategy: 'AUTO',
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  it('shows warn if codecov report is requested but no tests ran', () => {
    const result = execCmd<DeployResultJson>(
      'project deploy start --source-dir force-app --test-level NoTestRun --coverage-formatters html --json',
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;

    expect(result?.result.runTestsEnabled).to.equal(false);
    expect(result?.result.numberTestsTotal).to.equal(0);
    expect(result?.warnings).to.include(
      `\`--coverage-formatters\` was specified but no tests ran.${EOL}You can ensure tests run by specifying \`--test-level\` and setting it to \`RunSpecifiedTests\`, \`RunLocalTests\` or \`RunAllTestsInOrg\`.`
    );
  });
});
