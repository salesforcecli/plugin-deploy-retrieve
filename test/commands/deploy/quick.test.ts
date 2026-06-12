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

import { expect } from 'chai';
import sinon from 'sinon';
import { Org } from '@salesforce/core';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { stubMethod } from '@salesforce/ts-sinon';
import { DeployResultFormatter } from '../../../src/formatters/deployResultFormatter.js';
import { DeployCache } from '../../../src/utils/deployCache.js';
import { getDeployResult } from '../../utils/deployResponses.js';
import DeployQuick from '../../../src/commands/project/deploy/quick.js';

describe('project deploy quick', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  testOrg.isScratchOrg = true;
  testOrg.username = 'quick-test@org.com';

  let sfCommandUxStubs: ReturnType<typeof stubSfCommandUx>;
  let deployRecentValidationStub: sinon.SinonStub;
  let deployCacheCreateStub: sinon.SinonStub;
  let deployCacheUpdateStub: sinon.SinonStub;
  let pollStatusStub: sinon.SinonStub;
  let formatterDisplayStub: sinon.SinonStub;
  let formatterGetJsonStub: sinon.SinonStub;

  const deployResult = getDeployResult('successSync');
  const formattedResult = { ...deployResult.response, files: deployResult.getFileResponses() };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });
    sfCommandUxStubs = stubSfCommandUx($$.SANDBOX);

    deployRecentValidationStub = $$.SANDBOX.stub().resolves('750000000000001AAA');
    deployCacheCreateStub = stubMethod($$.SANDBOX, DeployCache, 'create').resolves({
      resolveLatest: () => '750000000000001AAA',
      maybeGet: () => undefined,
    } as unknown as DeployCache);
    deployCacheUpdateStub = stubMethod($$.SANDBOX, DeployCache, 'update').resolves();
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns({
      getAuthInfoFields: () => ({ username: testOrg.username, orgId: '00D000000000001' }),
      getUsername: () => testOrg.username,
      metadata: {
        deployRecentValidation: deployRecentValidationStub,
      },
    } as unknown as ReturnType<Org['getConnection']>);
    pollStatusStub = stubMethod($$.SANDBOX, MetadataApiDeploy.prototype, 'pollStatus').resolves(deployResult);
    formatterDisplayStub = stubMethod($$.SANDBOX, DeployResultFormatter.prototype, 'display').returns(undefined);
    formatterGetJsonStub = stubMethod($$.SANDBOX, DeployResultFormatter.prototype, 'getJson').resolves(formattedResult);
  });

  afterEach(() => {
    $$.restore();
  });

  it('suppresses command-owned logs when quiet succeeds', async () => {
    const result = await DeployQuick.run(['--use-most-recent', '--quiet', '--target-org', testOrg.username]);

    expect(result).to.deep.include({
      id: deployResult.response.id,
      status: RequestStatus.Succeeded,
    });
    expect(deployRecentValidationStub.calledOnce).to.equal(true);
    expect(deployCacheCreateStub.calledOnce).to.equal(true);
    expect(deployCacheUpdateStub.calledOnce).to.equal(true);
    expect(pollStatusStub.calledOnce).to.equal(true);
    expect(formatterDisplayStub.calledOnce).to.equal(true);
    expect(formatterGetJsonStub.calledOnce).to.equal(true);
    expect(sfCommandUxStubs.log.called).to.equal(false);
    expect(sfCommandUxStubs.logSuccess.called).to.equal(false);
  });

  it('still surfaces the failure message when quiet and the deploy fails', async () => {
    // a failed quick deploy with no component-level formatter failures must still explain itself
    const failedResult = getDeployResult('successSync');
    Object.assign(failedResult.response, { status: RequestStatus.Failed });
    pollStatusStub.resolves(failedResult);

    await DeployQuick.run(['--use-most-recent', '--quiet', '--target-org', testOrg.username]);

    // quiet collapses success only — failure detail must remain
    expect(sfCommandUxStubs.logSuccess.called).to.equal(false);
    const failureLogged = sfCommandUxStubs.log
      .getCalls()
      .some((call) => call.args.some((arg) => String(arg).includes('750000000000001AAA')));
    expect(failureLogged, 'expected the QuickDeployFailure message to be logged under --quiet').to.equal(true);
  });
});
