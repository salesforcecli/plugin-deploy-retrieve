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
import { DeployExtensionResult } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { DeployResultFormatter } from '../../src/formatters/deployResultFormatter.js';
import { getDeployResult } from '../utils/deployResponses.js';

type TableArgs = { title: string; data: Array<{ type: string; status: string; message: string }> };

describe('deployResultFormatter', () => {
  const sandbox = sinon.createSandbox();
  let tableStub: sinon.SinonStub;

  const getExtensionRows = (deployExtensionResults?: DeployExtensionResult | DeployExtensionResult[]) => {
    new DeployResultFormatter(getDeployResult('successSync', { deployExtensionResults }), {}).display();
    const table = tableStub
      .getCalls()
      .map((call) => call.args[0] as TableArgs)
      .find(({ title }) => stripVTControlCharacters(title) === 'Deploy Extensions');
    return table?.data;
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
      expect(getExtensionRows([{ type: 'Foo', status: 'Succeeded' }])).to.deep.equal([
        { type: 'Foo', status: 'Succeeded', message: '' },
      ]);
    });

    it('shows only the status for an extension that is not finished', () => {
      expect(getExtensionRows([{ type: 'Foo', status: 'InProgress', message: 'ignored' }])).to.deep.equal([
        { type: 'Foo', status: 'InProgress', message: '' },
      ]);
    });

    it('shows the message for a failed extension', () => {
      expect(getExtensionRows([{ type: 'Foo', status: 'Failed', message: 'boom' }])).to.deep.equal([
        { type: 'Foo', status: 'Failed', message: 'boom' },
      ]);
    });

    it('shows an empty message for a failed extension without one', () => {
      expect(getExtensionRows([{ type: 'Foo', status: 'Failed' }])).to.deep.equal([
        { type: 'Foo', status: 'Failed', message: '' },
      ]);
    });

    it('shows one row per extension, in order', () => {
      expect(
        getExtensionRows([
          { type: 'Foo', status: 'Succeeded' },
          { type: 'Bar', status: 'Failed', message: 'boom' },
        ])?.map(({ type }) => type)
      ).to.deep.equal(['Foo', 'Bar']);
    });

    it('handles a single extension result that is not in an array', () => {
      expect(getExtensionRows({ type: 'Foo', status: 'Succeeded' })).to.deep.equal([
        { type: 'Foo', status: 'Succeeded', message: '' },
      ]);
    });

    it('skips extension results without a type', () => {
      expect(getExtensionRows([{ type: '', status: 'Succeeded' }])).to.equal(undefined);
    });

    it('shows no table when the response has no extension results', () => {
      expect(getExtensionRows()).to.equal(undefined);
    });
  });
});
