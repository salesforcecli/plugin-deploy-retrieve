/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect, config } from 'chai';
import { SourceComponent, RegistryAccess } from '@salesforce/source-deploy-retrieve';
import { isSourceComponent, isSourceComponentWithXml } from '../../src/utils/types.js';

config.truncateThreshold = 0;

const reg = new RegistryAccess();
const type = reg.getTypeByName('ApexClass');

describe('isSourceComponent (type guard)', () => {
  describe('good', () => {
    it('SC constructed with xml', () => {
      expect(new SourceComponent({ name: 'foo', type, xml: 'classes/foo.cls' })).to.satisfy(isSourceComponent);
    });
    it('SC constructed with no xml', () => {
      const sc = new SourceComponent({ name: 'foo', type });
      // console.log(sc);
      // console.log(typeof sc.fullName);
      expect(sc).to.satisfy(isSourceComponent);
    });
  });
  describe('bad', () => {
    it('object is undefined', () => {
      expect(undefined).to.not.satisfy(isSourceComponent);
    });
    it('empty object', () => {
      expect({}).to.not.satisfy(isSourceComponent);
    });

    it('object.type is set to undefined', () => {
      expect({ fullName: 'foo', type: undefined, xml: 'fooXml' }).to.not.satisfy(isSourceComponent);
    });
  });
});

describe('isSourceComponentWithXml (type guard)', () => {
  describe('good', () => {
    it('SC constructed with xml', () => {
      expect(new SourceComponent({ name: 'foo', type, xml: 'classes/foo.cls' })).to.satisfy(isSourceComponentWithXml);
    });
  });
  describe('bad', () => {
    it('object is undefined', () => {
      expect(undefined).to.not.satisfy(isSourceComponentWithXml);
    });
    it('empty object', () => {
      expect({}).to.not.satisfy(isSourceComponentWithXml);
    });
    it('object.xml is undefined', () => {
      expect({ fullName: 'foo', type: 'fooType', content: 'fooContent' }).to.not.satisfy(isSourceComponentWithXml);
    });
    it('object.type is set to undefined', () => {
      expect({ fullName: 'foo', type: undefined, xml: 'fooXml' }).to.not.satisfy(isSourceComponentWithXml);
    });
    it('SC constructed with no xml', () => {
      expect(new SourceComponent({ name: 'foo', type })).to.not.satisfy(isSourceComponentWithXml);
    });
  });
});
