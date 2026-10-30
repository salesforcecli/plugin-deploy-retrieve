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
import { assert, expect } from 'chai';
import sinon from 'sinon';
import { DeployExtensionResult } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { DeployReportResultFormatter } from '../../src/formatters/deployReportResultFormatter.js';
import { getDeployResult } from '../utils/deployResponses.js';

type TableArgs = { title: string; data: Array<{ key: string; value: unknown }> };

describe('deployReportResultFormatter', () => {
  const sandbox = sinon.createSandbox();
  let tableStub: sinon.SinonStub;

  const getDeployInfoRows = (deployExtensionResults?: DeployExtensionResult | DeployExtensionResult[]) => {
    new DeployReportResultFormatter(getDeployResult('successSync', { deployExtensionResults }), {}).display();
    const deployInfo = tableStub
      .getCalls()
      .map((call) => call.args[0] as TableArgs)
      .find(({ title }) => stripVTControlCharacters(title) === 'Deploy Info');
    assert(deployInfo, 'Deploy Info table was not displayed');
    return deployInfo.data.filter(({ key }) => key.startsWith('deployextension.'));
  };

  beforeEach(() => {
    tableStub = sandbox.stub(Ux.prototype, 'table');
    sandbox.stub(Ux.prototype, 'log');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('deploy extension results', () => {
    it('shows only the status for a successful extension', () => {
      expect(getDeployInfoRows([{ type: 'Foo', status: 'Succeeded' }])).to.deep.equal([
        { key: 'deployextension.Foo', value: '{"status":"Succeeded"}' },
      ]);
    });

    it('shows the status for an extension that is not finished', () => {
      expect(getDeployInfoRows([{ type: 'Foo', status: 'InProgress', message: 'ignored' }])).to.deep.equal([
        { key: 'deployextension.Foo', value: '{"status":"InProgress"}' },
      ]);
    });

    it('shows the message and status for a failed extension', () => {
      expect(getDeployInfoRows([{ type: 'Foo', status: 'Failed', message: 'boom' }])).to.deep.equal([
        { key: 'deployextension.Foo', value: '{"message":"boom","status":"Failed"}' },
      ]);
    });

    it('shows an empty message for a failed extension without one', () => {
      expect(getDeployInfoRows([{ type: 'Foo', status: 'Failed' }])).to.deep.equal([
        { key: 'deployextension.Foo', value: '{"message":"","status":"Failed"}' },
      ]);
    });

    it('shows one row per extension, in order', () => {
      expect(
        getDeployInfoRows([
          { type: 'Foo', status: 'Succeeded' },
          { type: 'Bar', status: 'Failed', message: 'boom' },
        ]).map(({ key }) => key)
      ).to.deep.equal(['deployextension.Foo', 'deployextension.Bar']);
    });

    it('handles a single extension result that is not in an array', () => {
      expect(getDeployInfoRows({ type: 'Foo', status: 'Succeeded' })).to.deep.equal([
        { key: 'deployextension.Foo', value: '{"status":"Succeeded"}' },
      ]);
    });

    it('skips extension results without a type', () => {
      expect(getDeployInfoRows([{ type: '', status: 'Succeeded' }])).to.deep.equal([]);
    });

    it('shows no extension rows when the response has no extension results', () => {
      expect(getDeployInfoRows()).to.deep.equal([]);
    });
  });
});
