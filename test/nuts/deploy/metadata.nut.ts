/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { SourceTestkit } from '@salesforce/source-testkit';
import { DeployResultJson } from '../../../src/utils/types.js';

describe('deploy metadata NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      nut: fileURLToPath(import.meta.url),
    });
    await testkit.deploy({ args: '--source-dir force-app', exitCode: 0 });
  });

  after(async () => {
    await testkit?.clean();
  });

  it('should deploy ApexClasses from wildcard match (single character)', async () => {
    const response = await testkit.deploy({ args: '--metadata "ApexClass:P*"' });
    expect(response?.status).to.equal(0);
    const result = response?.result as unknown as DeployResultJson;
    expect(result.success).to.be.true;
    expect(result.files.length).to.equal(4);
    result.files.forEach((f) => {
      expect(f.type).to.equal('ApexClass');
      expect(['PagedResult', 'PropertyController']).to.include(f.fullName);
    });
  });

  it('should deploy ApexClasses from wildcard match (2 characters)', async () => {
    const response = await testkit.deploy({ args: '--metadata "ApexClass:Pa*"' });
    expect(response?.status).to.equal(0);
    const result = response?.result as unknown as DeployResultJson;
    expect(result.success).to.be.true;
    expect(result.files.length).to.equal(2);
    result.files.forEach((f) => {
      expect(f.type).to.equal('ApexClass');
      expect(f.fullName).to.equal('PagedResult');
    });
  });
});
