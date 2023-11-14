/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable class-methods-use-this */

import { expect } from 'chai';
import { Hook } from '@oclif/core';
import { Deployer } from '@salesforce/sf-plugins-core';
import Deploy from '../../src/commands/deploy.js';
import Result = Hook.Result;

class TestDeploy extends Deploy {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public constructor() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    super([]);
  }
  public async run() {}

  public async styledHeader() {}

  public async table() {}
}

describe('checkForHookFailures', () => {
  it('should not throw when no hook failures', () => {
    const testDeploy = new TestDeploy();
    testDeploy.checkForHookFailures({} as Result<Deployer[]>);
    expect(testDeploy).to.be.ok;
  });
  it('should throw when hook failures are present', () => {
    const testDeploy = new TestDeploy();
    const shouldThrow = () =>
      testDeploy.checkForHookFailures({
        successes: [],
        failures: [{ plugin: { name: 'foo' }, error: { name: 'fooerror', message: 'bad stuff happened' } }],
        // plugin has a lot more properties this test omits.
      } as unknown as Result<Deployer[]>);
    expect(shouldThrow).to.throw(/One or more initialization steps failed./);
  });
});

/**
 * Conversion of type '{ successes: never[]; failures: { plugin: { name: string; }; error: { name: string; message: string; }; }[]; }' to type 'Result<Deployer[]>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Types of property 'failures' are incompatible.
    Type '{ plugin: { name: string; }; error: { name: string; message: string; }; }[]' is not comparable to type '{ error: Error; plugin: Plugin; }[]'.
      Type '{ plugin: { name: string; }; error: { name: string; message: string; }; }' is not comparable to type '{ error: Error; plugin: Plugin; }'.
        Types of property 'plugin' are incompatible.
          Type '{ name: string; }' is missing the following properties from type 'Plugin': _base, alias, version, pjson, and 9 more.
 * 
 */
