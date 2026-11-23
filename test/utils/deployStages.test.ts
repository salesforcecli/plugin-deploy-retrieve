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
import { MultiStageOutput } from '@oclif/multi-stage-output';
import { MetadataApiDeploy, MetadataApiDeployStatus, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployStages } from '../../src/utils/deployStages.js';

type Handlers = {
  update?: (data: MetadataApiDeployStatus) => void;
  finish?: (data: { response: MetadataApiDeployStatus }) => void;
};

const fakeDeploy = (handlers: Handlers): MetadataApiDeploy =>
  ({
    id: '0Af000000000001',
    onUpdate: (cb: Handlers['update']) => {
      handlers.update = cb;
    },
    onFinish: (cb: Handlers['finish']) => {
      handlers.finish = cb;
    },
    onCancel: () => {},
    onError: () => {},
  } as unknown as MetadataApiDeploy);

const status = (overrides: Partial<MetadataApiDeployStatus>): MetadataApiDeployStatus =>
  ({
    status: RequestStatus.InProgress,
    numberComponentsDeployed: 0,
    numberComponentsTotal: 2,
    numberTestsTotal: 0,
    ...overrides,
  } as MetadataApiDeployStatus);

describe('DeployStages', () => {
  const sandbox = sinon.createSandbox();
  let skipToStub: sinon.SinonStub;
  let updateDataStub: sinon.SinonStub;

  const skippedStages = (): string[] => skipToStub.getCalls().map((call) => call.args[0] as string);

  beforeEach(() => {
    skipToStub = sandbox.stub(MultiStageOutput.prototype, 'skipTo');
    updateDataStub = sandbox.stub(MultiStageOutput.prototype, 'updateData');
    sandbox.stub(MultiStageOutput.prototype, 'stop');
    sandbox.stub(MultiStageOutput.prototype, 'error');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('enters Deploying Metadata once and only updates data on later progress events', () => {
    const handlers: Handlers = {};
    new DeployStages({ title: 'Deploying Metadata', jsonEnabled: true }).start({ deploy: fakeDeploy(handlers) });

    handlers.update?.(status({ numberComponentsDeployed: 1 }));
    handlers.update?.(status({ numberComponentsDeployed: 2 }));

    expect(skippedStages().filter((stage) => stage === 'Deploying Metadata')).to.have.length(1);
    expect(updateDataStub.lastCall.args[0]).to.deep.include({
      mdapiDeploy: status({ numberComponentsDeployed: 2 }),
    });
  });

  it('does not move back to Deploying Metadata after tests start running', () => {
    const handlers: Handlers = {};
    new DeployStages({ title: 'Deploying Metadata', jsonEnabled: true }).start({ deploy: fakeDeploy(handlers) });

    handlers.update?.(status({ numberComponentsDeployed: 2, numberTestsTotal: 3 }));
    handlers.finish?.({ response: status({ status: RequestStatus.Succeeded, numberComponentsDeployed: 2 }) });

    expect(skippedStages()).to.deep.equal(['Preparing', 'Deploying Metadata', 'Running Tests', 'Done']);
  });

  it('passes through Deploying Metadata when a deploy finishes without any progress events', () => {
    const handlers: Handlers = {};
    new DeployStages({ title: 'Deploying Metadata', jsonEnabled: true }).start({ deploy: fakeDeploy(handlers) });

    handlers.finish?.({ response: status({ status: RequestStatus.Succeeded }) });

    expect(skippedStages()).to.deep.equal(['Preparing', 'Deploying Metadata', 'Done']);
  });

  it('passes through Deploying Metadata once when done() is called directly (e.g. async quick deploy)', () => {
    const stages = new DeployStages({ title: 'Deploying Metadata', jsonEnabled: true });
    stages.done({ status: 'Queued' });
    stages.done({ status: 'Queued' });

    expect(skippedStages()).to.deep.equal(['Deploying Metadata', 'Done', 'Done']);
  });
});
