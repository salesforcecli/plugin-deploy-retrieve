/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { SourceTestkit } from '@salesforce/source-testkit';
import { SfError } from '@salesforce/core';
import { DeployResultJson } from '../../../src/utils/types.js';

const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <version>59.0</version>
</Package>
`;

describe('deploy metadata NUTs', () => {
  let testkit: SourceTestkit;
  const packageFile = 'package.xml';
  let xmlPath: string | undefined;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      nut: fileURLToPath(import.meta.url),
    });
    await testkit.deploy({ args: '--source-dir force-app', exitCode: 0 });
    xmlPath = join(testkit.projectDir, packageFile);
    await fs.promises.writeFile(xmlPath, packageXml);
  });

  after(async () => {
    await testkit?.clean();
  });

  it('should throw if component set is empty', async () => {
    const response = await testkit.deploy({ args: '' });
    expect(response?.status).to.equal(1);
    const result = response?.result as unknown as SfError;
    expect(result.name).to.equal('NothingToDeploy');
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
