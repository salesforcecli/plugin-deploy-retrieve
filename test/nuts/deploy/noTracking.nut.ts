/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import * as fs from 'fs-extra';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { DeployResultJson } from '../../../src/utils/types';

describe('deploy mdapi format without tracking', () => {
  let session: TestSession;
  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'AUTO',
      project: { name: 'mdapiDeployNoTracking' },
      scratchOrgs: [
        {
          edition: 'developer',
          tracksSource: false,
          setDefault: true,
        },
      ],
    });
    await Promise.all([
      fs.copy(join('test', 'nuts', 'deploy', 'mdapiOut.zip'), join(session.project.dir, 'mdapiOut.zip')),
      fs.copy(join('test', 'nuts', 'deploy', 'mdapiOut'), join(session.project.dir, 'mdapiOut')),
    ]);
  });

  it('can deploy mdapi format folder without a project', () => {
    const metadataDir = 'mdapiOut';
    const result = execCmd<DeployResultJson>(`project:deploy:start --metadata-dir ${metadataDir} --json`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
  });

  it('can deploy zipped mdapi without a project', () => {
    const zip = 'mdapiOut.zip';
    const result = execCmd<DeployResultJson>(`project:deploy:start --metadata-dir ${zip} --json`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
  });

  after(async () => {
    // workaround for weird lstat bug on windows
    await Promise.all([
      fs.rm(join(session.project.dir, 'mdapiOut.zip')),
      fs.rm(join(session.project.dir, 'mdapiOut'), { recursive: true }),
    ]);
    await session?.clean();
  });
});
