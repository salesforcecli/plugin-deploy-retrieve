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

import { join } from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { SourceTestkit } from '@salesforce/source-testkit';
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
    try {
      await testkit.deploy({ args: '--manifest package.xml --dry-run', json: true, exitCode: 1 });
    } catch (e) {
      const err = e as Error;
      expect(err.name).to.equal('NothingToDeploy');
    }
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
