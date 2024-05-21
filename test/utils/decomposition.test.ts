/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, assert } from 'chai';
import { getTypesFromPreset } from '../../src/utils/convertBehavior.js';

describe('source behavior changes', () => {
  describe('getTypesFromPreset', () => {
    // TODO: update to a long-lived preset when the beta is removed
    it('returns expected type for presets with sourceBehaviorOptions', async () => {
      expect(await getTypesFromPreset('decomposeCustomLabelsBeta')).to.deep.equal(['CustomLabels']);
    });
    it('throws ENOENT for non-existent presets', async () => {
      try {
        await getTypesFromPreset('nonExistentPreset');
      } catch (e) {
        assert(e instanceof Error);
        assert('code' in e);
        expect(e.code).to.equal('ENOENT');
      }
    });
  });
});
