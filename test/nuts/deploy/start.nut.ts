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
