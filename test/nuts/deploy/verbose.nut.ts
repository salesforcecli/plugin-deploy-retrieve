/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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

    expect(shellOutput.stdout).to.contain('Deploy size: ').and.contain('KB of ~39 MB limit');
    expect(shellOutput.stdout).to.contain('Deployed files count: 5 of 10,000 limit');
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

    expect(shellOutput.stdout).to.contain('Deploy size: ').and.contain('KB of ~39 MB limit');
    expect(shellOutput.stdout).to.contain('Deployed files count: 5 of 10,000 limit');
  });
});
