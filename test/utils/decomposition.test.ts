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
