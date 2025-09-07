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

import { join as pathJoin } from 'node:path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { type DeployResultJson } from '../../../src/utils/types.js';

describe('Deploy --verbose', () => {
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

  it('should have zip file size and file count returned with --json', () => {
    const cmdJson = execCmd<DeployResultJson>(
      'project deploy start --source-dir force-app/main/default/apex --verbose --json',
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;

    expect(cmdJson?.result.zipSize).to.be.within(1775, 1795);
    expect(cmdJson?.result.zipFileCount).to.equal(5);
  });

  it('should have zip file size and file count in the output', () => {
    const shellOutput = execCmd<DeployResultJson>(
      'project deploy start --source-dir force-app/main/default/apex --verbose',
      {
        ensureExitCode: 0,
      }
    ).shellOutput;

    expect(shellOutput.stdout).to.contain('Size: ').and.contain('KB of ~39 MB limit');
    expect(shellOutput.stdout).to.contain('Files: 5 of 10,000 limit');
  });

  it('should have zip file size and file count returned with --json --async', () => {
    const cmdJson = execCmd<DeployResultJson>(
      'project deploy start --source-dir force-app/main/default/apex --verbose --async --json',
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;

    expect(cmdJson?.result.zipSize).to.be.within(1775, 1795);
    expect(cmdJson?.result.zipFileCount).to.equal(5);
  });

  it('should have zip file size and file count in the output with --async', () => {
    const shellOutput = execCmd<DeployResultJson>(
      'project deploy start --source-dir force-app/main/default/apex --verbose --async',
      {
        ensureExitCode: 0,
      }
    ).shellOutput;

    expect(shellOutput.stdout).to.contain('Size: ').and.contain('KB of ~39 MB limit');
    expect(shellOutput.stdout).to.contain('Files: 5 of 10,000 limit');
  });

  it('should have test successes in the output', () => {
    const shellOutput = execCmd<DeployResultJson>(
      'project deploy start --source-dir force-app --verbose --test-level RunLocalTests --dry-run',
      {
        ensureExitCode: 0,
      }
    ).shellOutput;

    expect(shellOutput.stdout).to.contain('Test Success [1]');
  });

  it('should have test successes in the output when CI=true', () => {
    const ciEnvVar = process.env.CI;
    try {
      process.env.CI = 'true';
      const shellOutput = execCmd<DeployResultJson>(
        'project deploy start --source-dir force-app --verbose --test-level RunLocalTests --dry-run',
        {
          ensureExitCode: 0,
        }
      ).shellOutput;

      expect(shellOutput.stdout).to.contain('Test Success [1]');
    } finally {
      if (ciEnvVar === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = ciEnvVar;
      }
    }
  });
});
