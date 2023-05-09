/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { ApexTestResultOutcome } from '@salesforce/apex-node';
import { mapTestResults } from '../../src/utils/coverage';

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
});
