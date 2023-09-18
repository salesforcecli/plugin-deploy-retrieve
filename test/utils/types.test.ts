/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { SourceComponent, RegistryAccess } from '@salesforce/source-deploy-retrieve';
import { isSourceComponent } from '../../src/utils/types';

describe('isSourceComponent (type guard)', () => {
  describe('good', () => {
    it('full, correct definition', () => {
      expect({ fullName: 'foo', type: 'fooType', xml: 'fooXml', content: 'fooContent' }).to.satisfy(isSourceComponent);
    });
    it('SC constructed with xml', () => {
      const reg = new RegistryAccess();
      const type = reg.getTypeByName('ApexClass');
      expect(new SourceComponent({ name: 'foo', type, xml: 'classes/foo.cls' })).to.not.satisfy(isSourceComponent);
    });
  });
  describe('bad', () => {
    it('object is undefined', () => {
      expect(undefined).to.not.satisfy(isSourceComponent);
    });
    it('empty object', () => {
      expect({}).to.not.satisfy(isSourceComponent);
    });
    it('object.xml is undefined', () => {
      expect({ fullName: 'foo', type: 'fooType', content: 'fooContent' }).to.not.satisfy(isSourceComponent);
    });
    it('object.type is set to undefined', () => {
      expect({ fullName: 'foo', type: undefined, xml: 'fooXml' }).to.not.satisfy(isSourceComponent);
    });
    it('SC constructed with no xml', () => {
      const reg = new RegistryAccess();
      const type = reg.getTypeByName('ApexClass');
      expect(new SourceComponent({ name: 'foo', type })).to.not.satisfy(isSourceComponent);
    });
  });
});
