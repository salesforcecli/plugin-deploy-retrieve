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

import { DeployResult, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConfigAggregator } from '@salesforce/core';
import { determineExitCode, resolveApi, validateTests } from '../../src/utils/deploy.js';
import { API, TestLevel } from '../../src/utils/types.js';
import { ConfigVars } from '../../src/configMeta.js';

describe('deploy utils', () => {
  describe('validateTests', () => {
    it('should return true if test-level is not RunSpecifiedTests', () => {
      expect(validateTests(TestLevel.NoTestRun, [])).to.be.true;
      expect(validateTests(TestLevel.RunLocalTests, [])).to.be.true;
      expect(validateTests(TestLevel.RunAllTestsInOrg, [])).to.be.true;
    });

    it('should return true if tests are specified and test-level is RunSpecifiedTests', () => {
      const actual = validateTests(TestLevel.RunSpecifiedTests, ['foo']);
      expect(actual).to.be.true;
    });

    it('should return false if tests are not specified and test-level is RunSpecifiedTests', () => {
      const actual = validateTests(TestLevel.RunSpecifiedTests, []);
      expect(actual).to.be.false;
    });
  });

  describe('resolveApi', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return SOAP by default', async () => {
      sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
        key: '',
        isLocal(): boolean {
          throw new Error('Function not implemented.');
        },
        isGlobal(): boolean {
          throw new Error('Function not implemented.');
        },
        isEnvVar(): boolean {
          throw new Error('Function not implemented.');
        },
      });
      const actual = await resolveApi();
      expect(actual).to.equal(API.SOAP);
    });

    it('should return SOAP if org-metadata-rest-deploy is set to false', async () => {
      sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
        value: 'false',
        key: ConfigVars.ORG_METADATA_REST_DEPLOY,
        isLocal: () => true,
        isGlobal: () => false,
        isEnvVar: () => false,
      });
      const actual = await resolveApi();
      expect(actual).to.equal(API.SOAP);
    });

    it('should return REST if org-metadata-rest-deploy is set to true', async () => {
      sandbox.stub(ConfigAggregator.prototype, 'getInfo').returns({
        value: 'true',
        key: ConfigVars.ORG_METADATA_REST_DEPLOY,
        isLocal: () => true,
        isGlobal: () => false,
        isEnvVar: () => false,
      });
      const actual = await resolveApi();
      expect(actual).to.equal(API.REST);
    });
  });

  describe('determineExitCode', () => {
    it('should return 0 if status is Succeeded and is async deploy', () => {
      const deployResult = { response: { status: RequestStatus.Succeeded } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult, true);
      expect(actual).to.equal(0);
    });

    it('should return 1 if status is Failed and is async deploy', () => {
      const deployResult = { response: { status: RequestStatus.Failed } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult, true);
      expect(actual).to.equal(1);
    });

    it('should return 0 if status is Succeeded', () => {
      const deployResult = { response: { status: RequestStatus.Succeeded } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult);
      expect(actual).to.equal(0);
    });

    it('should return 1 if status is Canceled', () => {
      const deployResult = { response: { status: RequestStatus.Canceled } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult);
      expect(actual).to.equal(1);
    });

    it('should return 1 if status is Failed', () => {
      const deployResult = { response: { status: RequestStatus.Failed } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult);
      expect(actual).to.equal(1);
    });

    it('should return 68 if status is SucceededPartial', () => {
      const deployResult = { response: { status: RequestStatus.SucceededPartial } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult);
      expect(actual).to.equal(68);
    });

    it('should return 69 if status is InProgress', () => {
      const deployResult = { response: { status: RequestStatus.InProgress } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult);
      expect(actual).to.equal(69);
    });

    it('should return 69 if status is Pending', () => {
      const deployResult = { response: { status: RequestStatus.Pending } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult);
      expect(actual).to.equal(69);
    });

    it('should return 69 if status is Canceling', () => {
      const deployResult = { response: { status: RequestStatus.Canceling } } as unknown as DeployResult;
      const actual = determineExitCode(deployResult);
      expect(actual).to.equal(69);
    });
  });
});
