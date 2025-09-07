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
import * as fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { DeployResultJson, isSdrFailure, isSdrSuccess, RetrieveResultJson } from '../../../src/utils/types.js';
import { PreviewResult } from '../../../src/utils/previewOutput.js';
import { eBikesDeployResultCount } from './constants.js';

let session: TestSession;
describe('conflict detection and resolution', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
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
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it('pushes to initiate the remote', () => {
    const pushResult = execCmd<DeployResultJson>('deploy metadata --json');
    assert(pushResult.jsonOutput);
    expect(pushResult.jsonOutput.status, JSON.stringify(pushResult)).equals(0);
    const pushedSource = pushResult.jsonOutput.result.files;
    expect(pushedSource, JSON.stringify(pushedSource)).to.have.length.greaterThan(eBikesDeployResultCount - 5);
    expect(pushedSource, JSON.stringify(pushedSource)).to.have.length.lessThan(eBikesDeployResultCount + 5);
    expect(pushedSource.every(isSdrSuccess), JSON.stringify(pushedSource.filter(isSdrFailure))).to.equal(true);
  });

  it('edits a remote file', async () => {
    const username = session.orgs.get('default')?.username;
    const conn = await Connection.create({
      authInfo: await AuthInfo.create({ username }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = await conn.singleRecordQuery<{ Id: string; Metadata: any }>(
      "select Id, Metadata from CustomApplication where DeveloperName = 'EBikes'",
      {
        tooling: true,
      }
    );
    await conn.tooling.sobject('CustomApplication').update({
      ...app,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Metadata: {
        ...app.Metadata,
        description: 'modified',
      },
    });
    const result = execCmd<PreviewResult>('project retrieve preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(
      result?.toRetrieve.filter((r) => r.type === 'CustomApplication'),
      JSON.stringify(result)
    ).to.have.lengthOf(1);
  });
  it('edits a local file', async () => {
    const filePath = path.join(
      session.project.dir,
      'force-app',
      'main',
      'default',
      'applications',
      'EBikes.app-meta.xml'
    );
    await fs.promises.writeFile(
      filePath,
      (await fs.promises.readFile(filePath, { encoding: 'utf-8' })).replace('Lightning App Builder', 'App Builder')
    );
  });
  it('can see the conflict in status', () => {
    const result = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.conflicts.filter((app) => app.type === 'CustomApplication');
    // json is not sorted.  This relies on the implementation of getConflicts()
    expect(result).to.deep.equal([
      {
        type: 'CustomApplication',
        fullName: 'EBikes',
        conflict: true,
        ignored: false,
        operation: 'deploy',
        path: path.normalize(path.join(session.project.dir, 'force-app/main/default/applications/EBikes.app-meta.xml')),
        projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
      },
    ]);
  });

  it('can see the conflict in status (deploy)', () => {
    const result = execCmd<PreviewResult>('deploy metadata preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.conflicts.filter((app) => app.type === 'CustomApplication');
    // json is not sorted.  This relies on the implementation of getConflicts()
    expect(result).to.deep.equal([
      {
        type: 'CustomApplication',
        fullName: 'EBikes',
        path: path.resolve(path.normalize('force-app/main/default/applications/EBikes.app-meta.xml')),
        projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
        ignored: false,
        conflict: true,
        operation: 'deploy',
      },
    ]);
  });

  it('can see the conflict in status (retrieve)', () => {
    const result = execCmd<PreviewResult>('retrieve metadata preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.conflicts.filter((app) => app.type === 'CustomApplication');
    // json is not sorted.  This relies on the implementation of getConflicts()
    expect(result).to.deep.equal([
      {
        type: 'CustomApplication',
        fullName: 'EBikes',
        path: path.resolve(path.normalize('force-app/main/default/applications/EBikes.app-meta.xml')),
        projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
        ignored: false,
        conflict: true,
        operation: 'retrieve',
      },
    ]);
  });

  it('can see the conflict in status (deploy) ignoring conflicts', () => {
    const result = execCmd<PreviewResult>('deploy metadata preview --json -c', {
      ensureExitCode: 0,
    }).jsonOutput?.result.toDeploy.filter((app) => app.type === 'CustomApplication');
    // json is not sorted.  This relies on the implementation of getConflicts()
    expect(result).to.deep.equal([
      {
        type: 'CustomApplication',
        fullName: 'EBikes',
        path: path.resolve(path.normalize('force-app/main/default/applications/EBikes.app-meta.xml')),
        projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
        ignored: false,
        conflict: false,
        operation: 'deploy',
      },
    ]);
  });

  it('can see the conflict in status (retrieve) ignoring conflicts', () => {
    const result = execCmd<PreviewResult>('retrieve metadata preview --json -c', {
      ensureExitCode: 0,
    }).jsonOutput?.result.toRetrieve.filter((app) => app.type === 'CustomApplication');
    // json is not sorted.  This relies on the implementation of getConflicts()
    expect(result).to.deep.equal([
      {
        type: 'CustomApplication',
        fullName: 'EBikes',
        path: path.resolve(path.normalize('force-app/main/default/applications/EBikes.app-meta.xml')),
        projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
        ignored: false,
        conflict: false,
        operation: 'retrieve',
      },
    ]);
  });

  it('gets conflict error on push', () => {
    execCmd<DeployResultJson>('deploy metadata --json', { ensureExitCode: 1 });
  });
  it('gets conflict error on pull', () => {
    execCmd<RetrieveResultJson>('retrieve metadata --json', { ensureExitCode: 1 });
  });
  it('can push with forceoverwrite', () => {
    execCmd<DeployResultJson>('deploy metadata --ignore-conflicts --json', { ensureExitCode: 0 });
  });
});
