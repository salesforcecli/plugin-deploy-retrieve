/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { assert, expect, config } from 'chai';
import sinon from 'sinon';
import { DeployMessage, DeployResult, Failures, FileResponse } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { getCoverageFormattersOptions } from '../../src/utils/coverage.js';
import { getZipFileSize } from '../../src/utils/output.js';
import { DeployResultFormatter } from '../../src/formatters/deployResultFormatter.js';
import { TestLevel } from '../../src/utils/types.js';
import { getDeployResult } from './deployResponses.js';

config.truncateThreshold = 0;

describe('deployResultFormatter', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('displayFailures', () => {
    const deployResultFailure = getDeployResult('failed');
    let tableStub: sinon.SinonStub;
    let uxLogStub: sinon.SinonStub;

    beforeEach(() => {
      tableStub = sandbox.stub(Ux.prototype, 'table');
      uxLogStub = sandbox.stub(Ux.prototype, 'log');
    });

    it('prints file responses, and messages from server', () => {
      const formatter = new DeployResultFormatter(deployResultFailure, { verbose: true });
      formatter.display();
      expect(tableStub.callCount).to.equal(1);
      expect(tableStub.firstCall.args[0]).to.deep.equal({
        data: [
          {
            type: 'ApexClass',
            fullName: 'ProductController',
            error: 'This component has some problems',
            loc: '27:18',
          },
        ],
        columns: [
          { key: 'type', name: 'Type' },
          { key: 'fullName', name: 'Name' },
          { key: 'error', name: 'Problem' },
          { key: 'loc', name: 'Line:Column' },
        ],
        title: '\x1B[1m\x1B[31mComponent Failures [1]\x1B[39m\x1B[22m',
        overflow: 'wrap',
      });
    });

    it('displays errors from the server not in file responses', () => {
      const deployFailure = getDeployResult('failed');
      const error1 = {
        changed: false,
        componentType: 'ApexClass',
        created: false,
        createdDate: '2021-04-27T22:18:07.000Z',
        deleted: false,
        fileName: 'classes/ProductController.cls',
        fullName: 'ProductController',
        success: false,
        problemType: 'Error',
        problem: 'This component has some problems',
        lineNumber: '27',
        columnNumber: '18',
      } as DeployMessage;

      // add package.xml error, which is different from a FileResponse error
      const error2 = {
        changed: false,
        componentType: '',
        created: false,
        createdDate: '2023-11-17T21:18:36.000Z',
        deleted: false,
        fileName: 'package.xml',
        fullName: 'Create_property',
        problem:
          "An object 'Create_property' of type Flow was named in package.xml, but was not found in zipped directory",
        problemType: 'Error',
        success: false,
      } as DeployMessage;

      const testFailure1 = {
        id: '01pDS00001AQcuGYAT',
        message: 'System.AssertException: Assertion Failed: Expected: 0, Actual: 1',
        methodName: 'successResponse',
        name: 'GeocodingServiceTest',
        namespace: null,
        packageName: 'GeocodingServiceTest',
        stackTrace: 'Class.GeocodingServiceTest.successResponse: line 32, column 1',
        time: '70',
        type: 'Class',
      } as Failures;

      deployFailure.response.details.componentFailures = [error1, error2];
      deployFailure.response.numberTestErrors = 1;
      deployFailure.response.runTestsEnabled = true;
      deployFailure.response.details.runTestResult = {
        numTestsRun: '1',
        numFailures: '1',
        totalTime: '3511',
        failures: [testFailure1],
      };
      sandbox.stub(deployFailure, 'getFileResponses').returns([
        {
          fullName: error1.fullName,
          filePath: error1.fileName,
          type: error1.componentType,
          state: 'Failed',
          lineNumber: error1.lineNumber,
          columnNumber: error1.columnNumber,
          error: error1.problem,
          problemType: error1.problemType,
        },
      ] as FileResponse[]);
      const formatter = new DeployResultFormatter(deployFailure, {
        verbose: true,
        'test-level': TestLevel.RunAllTestsInOrg,
      });
      formatter.display();
      expect(tableStub.callCount).to.equal(1);
      expect(tableStub.firstCall.args[0]).to.deep.equal({
        data: [
          {
            type: '',
            fullName: 'Create_property',
            error:
              "An object 'Create_property' of type Flow was named in package.xml, but was not found in zipped directory",
            loc: '',
          },
          {
            type: 'ApexClass',
            fullName: 'ProductController',
            error: 'This component has some problems',
            loc: '27:18',
          },
        ],
        columns: [
          { key: 'type', name: 'Type' },
          { key: 'fullName', name: 'Name' },
          { key: 'error', name: 'Problem' },
          { key: 'loc', name: 'Line:Column' },
        ],
        title: '\x1B[1m\x1B[31mComponent Failures [2]\x1B[39m\x1B[22m',
        overflow: 'wrap',
      });
      // @ts-expect-error we expect args to be strings
      const uxLogArgs: Array<[string]> = uxLogStub.args;
      expect(stripVTControlCharacters(uxLogArgs[2][0])).to.equal('Test Failures [1]');
      expect(stripVTControlCharacters(uxLogArgs[3][0])).to.equal(`• ${testFailure1.name}.${testFailure1.methodName}`);
      expect(stripVTControlCharacters(uxLogArgs[4][0])).to.equal(`  message: ${testFailure1.message}`);
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
        const warnStub = sandbox.stub(Ux.prototype, 'warn');
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

describe('output util functions', () => {
  describe('getZipFileSize', () => {
    it('should return correct number of Bytes if 0', () => {
      expect(getZipFileSize(0)).to.equal('0 B');
    });
    it('should return correct number of Bytes', () => {
      expect(getZipFileSize(724)).to.equal('724 B');
    });
    it('should return correct number of KiloBytes', () => {
      expect(getZipFileSize(46_694)).to.equal('45.6 KB');
    });
    it('should return correct number of MegaBytes', () => {
      expect(getZipFileSize(724_992_234)).to.equal('691.41 MB');
    });
    it('should return correct number of GigaBytes', () => {
      expect(getZipFileSize(724_844_993_378)).to.equal('675.06 GB');
    });
  });
});
