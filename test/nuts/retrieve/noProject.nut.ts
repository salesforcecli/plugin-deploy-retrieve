/*
 * Copyright 2025, Salesforce, Inc.
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

import * as fs from 'node:fs';
import { join } from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert, expect } from 'chai';
import { RetrieveResultJson } from '../../../src/utils/types.js';

const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>*</members>
        <name>ConnectedApp</name>
    </types>
    <version>56.0</version>
</Package>
`;

describe('retrieve mdapi format without project', () => {
  const packageFile = 'package.xml';
  let xmlPath: string | undefined;
  let session: TestSession;
  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'AUTO',
    });
    assert(session.hubOrg.username);
    xmlPath = join(session.dir, packageFile);
    await fs.promises.writeFile(xmlPath, packageXml);
  });

  it('can retrieve without a project', () => {
    const outputDir = 'mdapiOut';
    const result = execCmd<RetrieveResultJson>(
      `project:retrieve:start -o ${session.hubOrg.username} --target-metadata-dir ${outputDir} -x ${xmlPath} --json`,
      {
        ensureExitCode: 0,
        cwd: session.dir,
      }
    ).jsonOutput?.result;
    // hub should have a connected app!
    expect(result?.files).to.not.be.empty;
  });

  after(async () => {
    await session?.clean();
  });
});
