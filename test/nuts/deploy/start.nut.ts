/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { fileURLToPath } from 'node:url';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { SourceTestkit } from '@salesforce/source-testkit';
import { DeployResultJson } from '../../../src/utils/types.js';

describe('project deploy start NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      nut: fileURLToPath(import.meta.url),
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  it('--source-dir --dry-run should NOT affect source-tracking', async () => {
    execCmd('project:deploy:start --dry-run --source-dir force-app', { ensureExitCode: 0 });
    const actual = execCmd<DeployResultJson>('project:deploy:start --json', { ensureExitCode: 0 }).jsonOutput; // should deploy everything since previous attempt was --dry-run
    expect(actual?.result?.numberComponentsDeployed).to.be.greaterThan(1);
  });
});
