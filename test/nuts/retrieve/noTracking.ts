/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import { join } from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert, expect } from 'chai';
import { RetrieveResultJson } from '../../../src/utils/types';

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
      project: {
        name: 'hasProjectNoTracking',
      },
      devhubAuthStrategy: 'AUTO',
    });
    assert(session.hubOrg.username);
    xmlPath = join(session.project.dir, packageFile);
    await fs.promises.writeFile(xmlPath, packageXml);
  });

  it('can retrieve using a project with a non-tracking org', () => {
    const outputDir = 'mdapiOut';
    const result = execCmd<RetrieveResultJson>(
      `project:retrieve:start -o ${session.hubOrg.username} --target-metadata-dir ${outputDir} -x ${xmlPath} --json`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    // hub should have a connected app but not have tracking on
    expect(result?.files).to.not.be.empty;
  });

  after(async () => {
    await session?.clean();
  });
});
