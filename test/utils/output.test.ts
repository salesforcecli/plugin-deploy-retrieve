/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'node:path';
import { assert, expect, config } from 'chai';
import sinon from 'sinon';
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { ux } from '@oclif/core';
import { getCoverageFormattersOptions } from '../../src/utils/coverage.js';
import { DeployResultFormatter } from '../../src/formatters/deployResultFormatter.js';
import { getDeployResult } from './deployResponses.js';

config.truncateThreshold = 0;

describe('deployResultFormatter', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('displayFailures', () => {
    const deployResultFailure = getDeployResult('failed');
    const tableStub = sandbox.stub(ux, 'table');

    it('prints file responses, and messages from server', () => {
      const formatter = new DeployResultFormatter(deployResultFailure, { verbose: true });
      formatter.display();
      expect(tableStub.callCount).to.equal(1);
      expect(tableStub.firstCall.args[0]).to.deep.equal([
        {
          error: 'This component has some problems',
          fullName: 'ProductController',
          loc: '27:18',
          problemType: 'Error',
        },
      ]);
    });
  });

  describe('coverage functions', () => {
    describe('getCoverageFormattersOptions', () => {
      it('clover, json', () => {
        const result = getCoverageFormattersOptions(['clover', 'json']);
        expect(result).to.deep.equal({
          reportFormats: ['clover', 'json'],
          reportOptions: {
            clover: { file: path.join('coverage', 'clover.xml'), projectRoot: '.' },
            json: { file: path.join('coverage', 'coverage.json') },
          },
        });
      });

      it('will warn when code coverage warning present from server', () => {
        const deployResult = getDeployResult('codeCoverageWarning');
        const formatter = new DeployResultFormatter(deployResult, {});
        const warnStub = sandbox.stub(ux, 'warn');
        formatter.display();
        expect(warnStub.callCount).to.equal(1);
        expect(warnStub.firstCall.args[0]).to.equal(
          'Average test coverage across all Apex Classes and Triggers is 25%, at least 75% test coverage is required.'
        );
      });

      it('will write test output when in json mode', async () => {
        const deployResult = getDeployResult('passedTest');
        const formatter = new DeployResultFormatter(deployResult, {
          junit: true,
          'coverage-formatters': ['text', 'cobertura'],
        });
        // private method stub
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const coverageReportStub = sandbox.stub(formatter, 'createCoverageReport');
        // private method stub
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const junitStub = sandbox.stub(formatter, 'createJunitResults');
        await formatter.getJson();
        expect(coverageReportStub.calledOnce).to.equal(true);
        expect(junitStub.calledOnce).to.equal(true);
      });

      it('teamcity', () => {
        const result = getCoverageFormattersOptions(['teamcity']);
        expect(result).to.deep.equal({
          reportFormats: ['teamcity'],
          reportOptions: {
            teamcity: { file: path.join('coverage', 'teamcity.txt'), blockName: 'coverage' },
          },
        });
      });
    });
  });

  describe('replacements', () => {
    const deployResultSuccess = getDeployResult('successSync');
    const deployResultSuccessWithReplacements = {
      ...getDeployResult('successSync'),
      replacements: new Map<string, string[]>([['foo', ['bar', 'baz']]]),
    } as DeployResult;

    describe('json', () => {
      it('shows replacements when not concise', async () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { verbose: true });
        const json = await formatter.getJson();
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
