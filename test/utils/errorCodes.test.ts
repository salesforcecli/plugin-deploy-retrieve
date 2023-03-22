/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS, DEPLOY_STATUS_CODES } from '../../src/utils/errorCodes';

describe('error codes', () => {
  describe('help descriptions DEPLOY_STATUS_CODES_DESCRIPTIONS', () => {
    it('creates an object with every status code as a key', () => {
      expect(Object.keys(DEPLOY_STATUS_CODES_DESCRIPTIONS).length).to.equal(DEPLOY_STATUS_CODES.size);
      DEPLOY_STATUS_CODES.forEach((value, key) => {
        expect(Object.keys(DEPLOY_STATUS_CODES_DESCRIPTIONS)).to.include(`${key} (${value})`);
      });
    });
  });
});
