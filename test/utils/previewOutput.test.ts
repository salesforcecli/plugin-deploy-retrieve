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
import { stripVTControlCharacters } from 'node:util';
import { expect } from 'chai';
import sinon from 'sinon';
import { ComponentSet, SourceComponent, TransportPlan } from '@salesforce/source-deploy-retrieve';
import { ForceIgnore } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { compileResults, printTables, PreviewResult } from '../../src/utils/previewOutput.js';
import { exampleSourceComponent } from './testConsts.js';

const plan: TransportPlan = {
  phases: [
    {
      phase: 'before-metadata',
      label: 'Elastic Compute',
      endpoint: '/services/data/compute',
      components: [{ fullName: 'App1', type: 'ComputeApp' }],
    },
    { phase: 'metadata-api', label: 'Metadata API', endpoint: '', components: [{ fullName: 'A', type: 'ApexClass' }] },
  ],
};

const forceIgnore = { denies: () => false } as unknown as ForceIgnore;

describe('previewOutput transport plan', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('compileResults', () => {
    const buildComponentSet = (pipeline?: ComponentSet['transportPipeline']): ComponentSet => {
      const componentSet = new ComponentSet([new SourceComponent(exampleSourceComponent)]);
      componentSet.transportPipeline = pipeline;
      return componentSet;
    };

    const compile = (componentSet: ComponentSet, filesWithConflicts = new Set<string>()): PreviewResult =>
      compileResults({
        componentSet,
        projectPath: '/dreamhouse-lwc',
        filesWithConflicts,
        forceIgnore,
        baseOperation: 'deploy',
      });

    it('asks the pipeline to explain the components that will be deployed', () => {
      const hasTransports = sandbox.stub().returns(true);
      const explain = sandbox.stub().returns(plan);
      const result = compile(
        buildComponentSet({ hasTransports, explain } as unknown as ComponentSet['transportPipeline'])
      );

      expect(result.transportPlan).to.deep.equal(plan);
      const [components, operation] = explain.firstCall.args as [SourceComponent[], string];
      expect(components.map((c) => c.fullName)).to.deep.equal([exampleSourceComponent.name]);
      expect(operation).to.equal('deploy');
    });

    it('leaves out components that will not go because of a conflict', () => {
      const hasTransports = sandbox.stub().returns(false);
      const explain = sandbox.stub();
      compile(
        buildComponentSet({ hasTransports, explain } as unknown as ComponentSet['transportPipeline']),
        new Set([exampleSourceComponent.xml as string])
      );

      expect(hasTransports.firstCall.args[0]).to.deep.equal([]);
      expect(explain.called).to.be.false;
    });

    it('has no transport plan when no pipeline is configured', () => {
      expect(compile(buildComponentSet()).transportPlan).to.be.undefined;
    });
  });

  describe('printTables', () => {
    const emptyResult: PreviewResult = { ignored: [], conflicts: [], toDeploy: [], toDelete: [], toRetrieve: [] };

    const loggedLines = (logStub: sinon.SinonStub): string[] =>
      logStub
        .getCalls()
        .map((call) => call.args[0] as string | undefined)
        .filter((line): line is string => typeof line === 'string')
        .map((line) => stripVTControlCharacters(line));

    it('prints each phase with its pre-/post- prefix and component names', () => {
      const logStub = sandbox.stub(Ux.prototype, 'log');
      sandbox.stub(Ux.prototype, 'table');
      printTables({ ...emptyResult, transportPlan: plan }, 'deploy');

      const lines = loggedLines(logStub);
      expect(lines).to.include('Deploy Operations [2]:');
      expect(lines).to.include('  1. Pre-Deploy (Elastic Compute (/services/data/compute)) — 1 component (App1)');
      expect(lines).to.include('  2. Metadata API — 1 component (A)');
    });

    it('truncates component names after 3 and uses Retrieve wording for retrieves', () => {
      const logStub = sandbox.stub(Ux.prototype, 'log');
      sandbox.stub(Ux.prototype, 'table');
      const names = ['App1', 'App2', 'App3', 'App4', 'App5'];
      printTables(
        {
          ...emptyResult,
          transportPlan: {
            phases: [
              {
                phase: 'after-metadata',
                label: 'Elastic Compute',
                endpoint: '',
                components: names.map((fullName) => ({ fullName, type: 'ComputeApp' })),
              },
            ],
          },
        },
        'retrieve'
      );

      const lines = loggedLines(logStub);
      expect(lines).to.include('Retrieve Operations [1]:');
      expect(lines).to.include('  1. Post-Retrieve (Elastic Compute) — 5 components (App1, App2, App3 +2 more)');
    });

    it('prints no operations section without a transport plan', () => {
      const logStub = sandbox.stub(Ux.prototype, 'log');
      sandbox.stub(Ux.prototype, 'table');
      printTables(emptyResult, 'deploy');

      expect(loggedLines(logStub).some((line) => line.includes('Operations ['))).to.be.false;
    });
  });
});
