/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { DeployResultJson } from '../../../src/utils/types';

describe('deploy mdapi format without tracking', () => {
  let session: TestSession;
  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'AUTO',
      project: {
        name: 'mdapiDeployNoTracking',
        sourceDir: join(process.cwd(), 'test', 'nuts', 'deploy', 'mdapiSource'),
      },
      scratchOrgs: [
        {
          edition: 'developer',
          tracksSource: false,
          setDefault: true,
        },
      ],
    });
  });

  it('can deploy mdapi format folder without a project', () => {
    const result = execCmd<DeployResultJson>('project:deploy:start --metadata-dir mdapiOut --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
  });

  it('can deploy zipped mdapi without a project', () => {
    const result = execCmd<DeployResultJson>('project:deploy:start --metadata-dir mdapiOut.zip --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
  });

  after(async () => {
    await session?.clean();
  });
});
