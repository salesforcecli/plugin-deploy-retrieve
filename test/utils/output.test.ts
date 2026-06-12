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
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { assert, expect, config } from 'chai';
import sinon from 'sinon';
import {
  DeployMessage,
  DeployResult,
  Failures,
  FileResponse,
  ComponentStatus,
} from '@salesforce/source-deploy-retrieve';
import { Org } from '@salesforce/core';
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
      const failureTable = tableStub.firstCall?.args[0] as { title?: string } | undefined;
      expect(failureTable).to.exist;
      expect(stripVTControlCharacters(failureTable?.title ?? '')).to.equal('Component Failures [1]');
      const { title, ...tableArgs } = failureTable as { title: string };
      expect(tableArgs).to.deep.equal({
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
        overflow: 'wrap',
      });
      expect(stripVTControlCharacters(title)).to.equal('Component Failures [1]');
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
      const failureTable = tableStub.firstCall?.args[0] as { title?: string } | undefined;
      expect(failureTable).to.exist;
      expect(stripVTControlCharacters(failureTable?.title ?? '')).to.equal('Component Failures [2]');
      const { title, ...tableArgs } = failureTable as { title: string };
      expect(tableArgs).to.deep.equal({
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
        overflow: 'wrap',
      });
      expect(stripVTControlCharacters(title)).to.equal('Component Failures [2]');
      // @ts-expect-error we expect args to be strings
      const uxLogArgs: Array<[string]> = uxLogStub.args;
      expect(stripVTControlCharacters(uxLogArgs[2][0])).to.equal('Test Failures [1]');
      expect(stripVTControlCharacters(uxLogArgs[3][0])).to.equal(`• ${testFailure1.name}.${testFailure1.methodName}`);
      expect(stripVTControlCharacters(uxLogArgs[4][0])).to.equal(`  message: ${testFailure1.message}`);
    });
  });

  describe('displayDeletes', () => {
    let tableStub: sinon.SinonStub;

    beforeEach(() => {
      tableStub = sandbox.stub(Ux.prototype, 'table');
    });

    it('should display pre-destructive delete files in Deleted Source table', () => {
      const deployResult = getDeployResult('successSync');

      // Create pre-destructive file responses with proper typing
      const preDestructiveFiles: FileResponse[] = [
        {
          fullName: 'CustomObject__c',
          type: 'CustomObject',
          state: ComponentStatus.Deleted,
          filePath: 'force-app/main/default/objects/CustomObject__c/CustomObject__c.object-meta.xml',
        },
        {
          fullName: 'CustomField__c.TestField__c',
          type: 'CustomField',
          state: ComponentStatus.Deleted,
          filePath: 'force-app/main/default/objects/CustomObject__c/fields/TestField__c.field-meta.xml',
        },
      ];

      // Pass pre-destructive files as extraDeletes to formatter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-argument
      const formatter = new DeployResultFormatter(deployResult, { verbose: true }, preDestructiveFiles as any);
      formatter.display();

      // The formatter should call table() to display the Deleted Source
      const deletesTableCall = tableStub.getCalls().find((call) => {
        const callArg = call.args[0] as { title?: string };
        return callArg?.title && callArg.title.includes('Deleted Source');
      });

      expect(deletesTableCall).to.exist;
      if (deletesTableCall) {
        const tableArg = deletesTableCall.args[0] as {
          data: Array<{ fullName: string; type: string; filePath: string; state: string }>;
        };
        expect(tableArg.data).to.deep.equal([
          {
            fullName: 'CustomObject__c',
            type: 'CustomObject',
            state: 'Deleted',
            filePath: 'force-app/main/default/objects/CustomObject__c/CustomObject__c.object-meta.xml',
          },
          {
            fullName: 'CustomField__c.TestField__c',
            type: 'CustomField',
            state: 'Deleted',
            filePath: 'force-app/main/default/objects/CustomObject__c/fields/TestField__c.field-meta.xml',
          },
        ]);
      }
    });

    it('should not display Deleted Source table when there are no deletes', () => {
      const deployResult = getDeployResult('successSync');

      // Pass empty pre-destructive files
      const formatter = new DeployResultFormatter(deployResult, { verbose: true }, []);
      formatter.display();

      // Verify no Deleted Source table is displayed
      const deletesTableCall = tableStub.getCalls().find((call) => {
        const callArg = call.args[0] as { title?: string };
        return callArg?.title && callArg.title.includes('Deleted Source');
      });

      expect(deletesTableCall).to.not.exist;
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
        const logStub = sandbox.stub(Ux.prototype, 'log');
        const tableStub = sandbox.stub(Ux.prototype, 'table');
        const warnStub = sandbox.stub(Ux.prototype, 'warn');
        formatter.display();
        expect(logStub.callCount).to.be.greaterThan(0);
        expect(tableStub.callCount).to.be.greaterThan(0);
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

  describe('quiet', () => {
    const deployResultSuccess = getDeployResult('successSync');
    const deployResultSuccessWithReplacements = {
      ...getDeployResult('successSync'),
      replacements: new Map<string, string[]>([['foo', ['bar', 'baz']]]),
    } as DeployResult;
    const targetOrg = {
      getUsername: () => 'my-scratch',
      getConnection: () => ({
        getUsername: () => 'my-scratch',
      }),
    } as unknown as Org;

    let tableStub: sinon.SinonStub;
    let uxLogStub: sinon.SinonStub;

    beforeEach(() => {
      tableStub = sandbox.stub(Ux.prototype, 'table');
      uxLogStub = sandbox.stub(Ux.prototype, 'log');
    });

    it('shows a single-line summary when quiet succeeds', () => {
      const formatter = new DeployResultFormatter(deployResultSuccess, { quiet: true, 'target-org': targetOrg });
      formatter.display();
      expect(tableStub.called).to.be.false;
      expect(uxLogStub.callCount).to.equal(1);
      expect(uxLogStub.firstCall.args[0]).to.equal(
        'Deployed 1/1 components to my-scratch (Deploy ID 0Af21000011PxhqCAC).'
      );
    });

    it('uses validated wording when quiet and checkOnly succeeds', () => {
      const deployResult = {
        ...deployResultSuccess,
        response: {
          ...deployResultSuccess.response,
          checkOnly: true,
        },
      } as DeployResult;
      const formatter = new DeployResultFormatter(deployResult, { quiet: true, 'target-org': targetOrg });
      formatter.display();
      expect(uxLogStub.callCount).to.equal(1);
      expect(uxLogStub.firstCall.args[0]).to.equal(
        'Validated 1/1 components to my-scratch (Deploy ID 0Af21000011PxhqCAC).'
      );
    });

    it('falls back to failure output when quiet and the deploy fails', () => {
      const deployResult = getDeployResult('failedTest');
      const formatter = new DeployResultFormatter(deployResult, {
        quiet: true,
        'target-org': targetOrg,
        'test-level': TestLevel.RunAllTestsInOrg,
      });
      formatter.display();
      expect(tableStub.callCount).to.equal(1);
      expect(tableStub.firstCall.args[0]).to.have.property('title').that.includes('Component Failures');
      expect(uxLogStub.getCalls().some((call) => call.args.some((arg) => String(arg).includes('Test Failures [1]')))).to
        .be.true;
    });

    it('returns concise-equivalent json when quiet', async () => {
      const quietFormatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { quiet: true });
      const conciseFormatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { concise: true });
      const quietJson = await quietFormatter.getJson();
      const conciseJson = await conciseFormatter.getJson();
      expect(quietJson).to.deep.equal(conciseJson);
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
      let tableStub: sinon.SinonStub;
      let logStub: sinon.SinonStub;
      beforeEach(() => {
        tableStub = sandbox.stub(Ux.prototype, 'table');
        logStub = sandbox.stub(Ux.prototype, 'log');
      });

      it('shows replacements when verbose and replacements exist', () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { verbose: true });
        formatter.display();
        const replacementsTableCall = tableStub.getCalls().find((call) => {
          const callArg = call.args[0] as { title?: string };
          return callArg?.title && callArg.title.includes('Metadata Replacements');
        });
        expect(replacementsTableCall).to.exist;
        expect(logStub.callCount).to.be.greaterThan(0);
      });

      it('no replacements when verbose but there are none', () => {
        const formatter = new DeployResultFormatter(deployResultSuccess, { verbose: true });
        formatter.display();
        const replacementsTableCall = tableStub.getCalls().find((call) => {
          const callArg = call.args[0] as { title?: string };
          return callArg?.title && callArg.title.includes('Metadata Replacements');
        });
        expect(replacementsTableCall).to.not.exist;
      });
      it('no replacements when not verbose', () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { verbose: false });
        formatter.display();
        const replacementsTableCall = tableStub.getCalls().find((call) => {
          const callArg = call.args[0] as { title?: string };
          return callArg?.title && callArg.title.includes('Metadata Replacements');
        });
        expect(replacementsTableCall).to.not.exist;
      });
      it('no replacements when concise', () => {
        const formatter = new DeployResultFormatter(deployResultSuccessWithReplacements, { concise: true });
        formatter.display();
        const replacementsTableCall = tableStub.getCalls().find((call) => {
          const callArg = call.args[0] as { title?: string };
          return callArg?.title && callArg.title.includes('Metadata Replacements');
        });
        expect(replacementsTableCall).to.not.exist;
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
