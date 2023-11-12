/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { ApexTestResultOutcome } from '@salesforce/apex-node';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { coverageOutput, getCoveragePct, mapTestResults } from '../../src/utils/coverage.js';

// methods are mutating the object instead of returning new ones
function getSampleTestResult() {
  return {
    codeCoverage: [
      {
        id: '01p19000002uDLAAA2',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'PagedResult',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '4',
        numLocationsNotCovered: '1',
        type: 'Class',
      },
      {
        id: '01p19000002uDLBAA2',
        locationsNotCovered: [
          {
            column: '0',
            line: '26',
            numExecutions: '0',
            time: '-1.0',
          },
          {
            column: '0',
            line: '31',
            numExecutions: '0',
            time: '-1.0',
          },
          {
            column: '0',
            line: '78',
            numExecutions: '0',
            time: '-1.0',
          },
        ],
        name: 'PropertyController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '44',
        numLocationsNotCovered: '3',
        type: 'Class',
      },
      {
        id: '01p19000002uDLCAA2',
        name: 'SampleDataController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '34',
        numLocationsNotCovered: '0',
        type: 'Class',
      },
      {
        id: '01p19000002uDL8AAM',
        name: 'GeocodingService',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '36',
        numLocationsNotCovered: '0',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAAAN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'A',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '100',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAAAN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'B',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '26',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAABN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'C',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '25',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAABN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'D',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '11',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAABN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'E',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '10',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAACN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'F',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '0',
        type: 'Class',
      },
    ],
    failures: {
      id: '01p19000002uDLDAA2',
      message: 'System.QueryException: Insufficient permissions: secure query included inaccessible field',
      methodName: 'testGetPagedPropertyList',
      name: 'TestPropertyController',
      namespace: {
        $: {
          'xsi:nil': 'true',
        },
      },
      packageName: 'TestPropertyController',
      stackTrace:
        'Class.PropertyController.getPagedPropertyList: line 52, column 1\nClass.TestPropertyController.testGetPagedPropertyList: line 22, column 1',
      time: '604.0',
      type: 'Class',
    },
    numFailures: '1',
    numTestsRun: '7',
    successes: [
      {
        id: '01p19000002uDL9AAM',
        methodName: 'blankAddress',
        name: 'GeocodingServiceTest',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '26.0',
      },
      {
        id: '01p19000002uDL9AAM',
        methodName: 'errorResponse',
        name: 'GeocodingServiceTest',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '77.0',
      },
      {
        id: '01p19000002uDL9AAM',
        methodName: 'successResponse',
        name: 'GeocodingServiceTest',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '63.0',
      },
      {
        id: '01p19000002uDLDAA2',
        methodName: 'testGetPicturesNoResults',
        name: 'TestPropertyController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '691.0',
      },
      {
        id: '01p19000002uDLDAA2',
        methodName: 'testGetPicturesWithResults',
        name: 'TestPropertyController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '1873.0',
      },
      {
        id: '01p19000002uDLEAA2',
        methodName: 'importSampleData',
        name: 'TestSampleDataController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '1535.0',
      },
    ],
    totalTime: '4952.0',
  };
}

describe('coverage utils', () => {
  describe('mapTestResultsTests', () => {
    it('should map result without a message to a succeeded test', () => {
      const resultsArray = mapTestResults([
        {
          id: 'myId',
          methodName: 'mySuccessMethod',
          name: 'myName',
          time: '42',
        },
      ]);
      expect(resultsArray).to.have.length(1);

      const result = resultsArray[0];

      expect(result.outcome).to.be.eq(ApexTestResultOutcome.Pass);
      expect(result.message).to.be.null;
      expect(result.fullName).to.be.eq('myName');
      expect(result.methodName).to.be.eq('mySuccessMethod');
      expect(result.runTime).to.be.eq(42);
    });

    it('should map result with a message to a failed test', () => {
      const resultsArray = mapTestResults([
        {
          id: 'myId',
          methodName: 'myFailedMethod',
          name: 'myName',
          time: '42',
          message: 'Something went wrong',
          stackTrace: 'SomeStackTrace',
        },
      ]);
      expect(resultsArray).to.have.length(1);

      const result = resultsArray[0];

      expect(result.outcome).to.be.eq(ApexTestResultOutcome.Fail);
      expect(result.message).to.be.eq('Something went wrong');
      expect(result.fullName).to.be.eq('myName');
      expect(result.methodName).to.be.eq('myFailedMethod');
      expect(result.runTime).to.be.eq(42);
      expect(result.stackTrace).to.be.eq('SomeStackTrace');
    });
  });

  describe('coverageOutput', () => {
    it('one uncovered line, warning color', () => {
      const cov = getSampleTestResult().codeCoverage[0];
      expect(coverageOutput(cov)).to.deep.equal({
        name: cov.name,
        coveragePercent: StandardColors.warning('75%'),
        linesNotCovered: '12',
      });
    });
    it('3 uncovered lines, in the success color', () => {
      const cov = getSampleTestResult().codeCoverage[1];
      expect(coverageOutput(cov)).to.deep.equal({
        name: cov.name,
        coveragePercent: StandardColors.success('93%'),
        linesNotCovered: '26,31,78',
      });
    });
    it('all covered', () => {
      const cov = getSampleTestResult().codeCoverage[2];
      expect(coverageOutput(cov)).to.deep.equal({
        name: cov.name,
        coveragePercent: StandardColors.success('100%'),
        linesNotCovered: '',
      });
    });
    it('none covered', () => {
      const cov = getSampleTestResult().codeCoverage[4];
      expect(coverageOutput(cov)).to.deep.equal({
        name: cov.name,
        coveragePercent: StandardColors.error('0%'),
        // only 1 shows as uncovered, BUT the numLocations says they all are`
        linesNotCovered: '12',
      });
    });
  });

  describe('coverage percent (the number)', () => {
    it('1 uncovered of 4', () => {
      expect(getCoveragePct(getSampleTestResult().codeCoverage[0])).equal(75);
    });
    it('rounds 3 uncovered out of 44 to the nearest integer', () => {
      expect(getCoveragePct(getSampleTestResult().codeCoverage[1])).equal(93);
    });
    it('all covered', () => {
      expect(getCoveragePct(getSampleTestResult().codeCoverage[2])).equal(100);
    });
  });
});
