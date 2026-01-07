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
