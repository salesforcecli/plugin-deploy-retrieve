/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { assert, expect, config } from 'chai';
import * as sinon from 'sinon';

import { DeployResultFormatter } from '../../src/utils/output';
import { getDeployResult } from './deployResponses';

config.truncateThreshold = 0;

describe('deployResultFormatter', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('replacements', () => {
    const deployResultSuccess = getDeployResult('successSync');
    const deployResultSuccessWithReplacements = {
      ...getDeployResult('successSync'),
      replacements: new Map<string, string[]>([['foo', ['bar', 'baz']]]),
    } as DeployResult;

    describe('json', () => {
      it('shows replacements when not concise', () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { verbose: true });
        const json = formatter.getJson();
        assert('replacements' in json && json.replacements);
        expect(json.replacements).to.deep.equal({ foo: ['bar', 'baz'] });
      });
      it('no replacements when concise', () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { concise: true });
        const json = formatter.getJson();
        expect(json).to.not.have.property('replacements');
      });
    });
    describe('human', () => {
      let uxStub: sinon.SinonStub;
      beforeEach(() => {
        uxStub = sandbox.stub(process.stdout, 'write');
      });

      const getStdout = () =>
        uxStub
          .getCalls()
          // args are typed as any[]
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          .flatMap((call) => call.args)
          .join('\n');

      it('shows replacements when verbose and replacements exist', () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { verbose: true });
        formatter.display();
        expect(getStdout()).to.include('Metadata Replacements');
        expect(getStdout()).to.include('TEXT REPLACED');
      });

      it('no replacements when verbose but there are none', () => {
        const formatter = new DeployResultFormatter(deployResultSuccess, { verbose: true });
        formatter.display();
        expect(getStdout()).to.not.include('Metadata Replacements');
      });
      it('no replacements when not verbose', () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { verbose: false });
        formatter.display();
        expect(getStdout()).to.not.include('Metadata Replacements');
      });
      it('no replacements when concise', () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { concise: true });
        formatter.display();
        expect(getStdout()).to.not.include('Metadata Replacements');
      });
    });
  });
});
