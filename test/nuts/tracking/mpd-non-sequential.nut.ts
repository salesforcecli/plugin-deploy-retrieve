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

import * as path from 'node:path';
import { AuthInfo, Connection } from '@salesforce/core';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert } from '@salesforce/ts-types';
import { DeployResultJson } from '../../../src/utils/types.js';

let session: TestSession;
let conn: Connection;

describe('multiple pkgDirectories pushed as one deploy', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/salesforcecli/sample-project-multiple-packages',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          executable: 'sf',
          duration: 1,
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });

    conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: session.orgs.get('default')?.username,
      }),
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('mpd non-sequential', () => {
    it('pushes using MPD', () => {
      const result = execCmd<DeployResultJson>('project:deploy:start --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result.files;
      assert(Array.isArray(result));
      // the fields should be populated
      expect(result.every((row) => row.type && row.fullName)).to.equal(true);
    });

    it('should have 2 deployments', async () => {
      const deployments = await conn.tooling.query('SELECT Id, Status, StartDate, CompletedDate FROM DeployRequest');
      // one deployment was the scratch org settings; the other 3 are the 3 pkgDirs
      expect(deployments.totalSize).to.equal(2);
    });
  });
});
