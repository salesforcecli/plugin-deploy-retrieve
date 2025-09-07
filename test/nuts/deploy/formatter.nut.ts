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
import { EOL } from 'node:os';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { DeployResultJson } from '../../../src/utils/types.js';

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
