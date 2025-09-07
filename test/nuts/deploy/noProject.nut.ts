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

import { join } from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { DeployResultJson } from '../../../src/utils/types.js';

describe('deploy mdapi format without project', () => {
  let session: TestSession;
  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          alias: 'deployNoProject',
          edition: 'developer',
        },
      ],
    });
  });

  it('can deploy mdapi format folder without a project', () => {
    const metadataDir = join(process.cwd(), 'test', 'nuts', 'deploy', 'mdapiSource', 'mdapiOut');
    const result = execCmd<DeployResultJson>(
      `project:deploy:start -o deployNoProject --metadata-dir ${metadataDir} --json`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
  });

  it('can deploy zipped mdapi without a project', () => {
    const zip = join(process.cwd(), 'test', 'nuts', 'deploy', 'mdapiSource', 'mdapiOut.zip');
    const result = execCmd<DeployResultJson>(`project:deploy:start -o deployNoProject --metadata-dir ${zip} --json`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
  });

  after(async () => {
    await session?.clean();
  });
});
