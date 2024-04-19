/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { DeployResultJson } from '../../../src/utils/types.js';

describe('deploy mdapi format without tracking', () => {
  let session: TestSession;
  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'AUTO',
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
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

  it('deploy changes and run 2 specified tests', () => {
    const result = execCmd<DeployResultJson>(
      'project:deploy:start --test-level RunSpecifiedTests --tests FileUtilitiesTest --tests GeocodingServiceTest --json'
    ).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
    expect(result?.numberTestsCompleted).to.equal(7);
  });

  it('deploy dir and run 2 specified tests', () => {
    const result = execCmd<DeployResultJson>(
      'project:deploy:start --source-dir force-app --test-level RunSpecifiedTests --tests FileUtilitiesTest --tests GeocodingServiceTest  --json'
    ).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
    expect(result?.numberTestsCompleted).to.equal(7);
  });

  it('deploy a bit of metadata and run all tests', () => {
    // the project hasn't really deployed because tests keep failing coverage, etc.  Deploy so all components are in the org
    execCmd<DeployResultJson>('project:deploy:start  --source-dir force-app', { ensureExitCode: 0 });
    const result = execCmd<DeployResultJson>(
      'project:deploy:start --metadata CustomApplication --test-level RunAllTestsInOrg  --json'
    ).jsonOutput?.result;
    expect(result?.files).to.not.be.empty;
    expect(result?.numberTestsCompleted).to.equal(11); // this number could change if dreamhouse changes
  });

  after(async () => {
    await session?.clean();
  });
});
