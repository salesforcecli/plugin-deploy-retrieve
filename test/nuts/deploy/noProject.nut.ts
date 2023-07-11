/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { DeployResultJson } from '../../../src/utils/types';

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
    const metadataDir = join('test', 'nuts', 'deploy', 'mdapiOut');
    const result = execCmd<DeployResultJson>(
      `project:deploy:start -o deployNoProject --metadata-dir ${metadataDir} --json`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
  });

  it('can deploy zipped mdapi without a project', () => {
    const zip = join('test', 'nuts', 'deploy', 'mdapiOut.zip');
    const result = execCmd<DeployResultJson>(`project:deploy:start -o deployNoProject --metadata-dir ${zip} --json`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
  });

  after(async () => {
    await session?.clean();
  });
});
