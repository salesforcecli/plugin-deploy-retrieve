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

  it('deploy dir and run 2 specified tests using the installed CLI', () => {
    const result = execCmd<DeployResultJson>(
      'project:deploy:start --source-dir force-app --test-level RunSpecifiedTests --tests FileUtilitiesTest --tests GeocodingServiceTest  --json',
      { cli: 'sf' }
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
