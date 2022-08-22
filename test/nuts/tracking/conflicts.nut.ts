/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { StatusResult } from '@salesforce/plugin-source/lib/formatters/source/statusFormatter';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types';
import { PreviewResult } from '../../../src/utils/previewOutput';
import { eBikesDeployResultCount } from './constants';

let session: TestSession;
describe('conflict detection and resolution', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
      },
      setupCommands: [`sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`],
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it('pushes to initiate the remote', () => {
    // This would go in setupCommands but we want it to use the bin/dev version
    const pushResult = execCmd<DeployResultJson>('deploy metadata --json', { cli: 'sf' });
    expect(pushResult.jsonOutput?.status, JSON.stringify(pushResult)).equals(0);
    const pushedSource = pushResult.jsonOutput.result.files;
    expect(pushedSource, JSON.stringify(pushedSource)).to.have.lengthOf(eBikesDeployResultCount);
    expect(
      pushedSource.every((r) => r.state !== ComponentStatus.Failed),
      JSON.stringify(pushedSource.filter((r) => r.state === ComponentStatus.Failed))
    ).to.equal(true);
  });

  it('edits a remote file', async () => {
    const conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: (session.setup[0] as { result: { username: string } }).result?.username,
      }),
    });
    const app = await conn.singleRecordQuery<{ Id: string; Metadata: any }>(
      "select Id, Metadata from CustomApplication where DeveloperName = 'EBikes'",
      {
        tooling: true,
      }
    );
    await conn.tooling.sobject('CustomApplication').update({
      ...app,
      Metadata: {
        ...app.Metadata,
        description: 'modified',
      },
    });
    const result = execCmd<StatusResult[]>('force:source:status --json --remote', {
      ensureExitCode: 0,
      cli: 'sfdx',
    }).jsonOutput.result;
    expect(
      result.filter((r) => r.type === 'CustomApplication'),
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
    const result = execCmd<StatusResult[]>('force:source:status --json', {
      ensureExitCode: 0,
    }).jsonOutput.result.filter((app) => app.type === 'CustomApplication');
    // json is not sorted.  This relies on the implementation of getConflicts()
    expect(result).to.deep.equal([
      {
        type: 'CustomApplication',
        state: 'Local Changed (Conflict)',
        fullName: 'EBikes',
        filePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
        ignored: false,
        conflict: true,
        origin: 'Local',
        actualState: 'Changed',
      },
      {
        type: 'CustomApplication',
        state: 'Remote Changed (Conflict)',
        fullName: 'EBikes',
        filePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
        ignored: false,
        conflict: true,
        origin: 'Remote',
        actualState: 'Changed',
      },
    ]);
  });

  describe('preview with and without ignore-conflicts', () => {
    it('sf can see the conflict in status (deploy)', () => {
      const result = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.conflicts.filter((app) => app.type === 'CustomApplication');
      // json is not sorted.  This relies on the implementation of getConflicts()
      expect(result).to.deep.equal([
        {
          type: 'CustomApplication',
          name: 'EBikes',
          path: path.resolve(path.normalize('force-app/main/default/applications/EBikes.app-meta.xml')),
          projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
          ignored: false,
          conflict: true,
          operation: 'deploy',
        },
      ]);
    });

    it('sf can see the conflict in status (retrieve)', () => {
      const result = execCmd<PreviewResult>('retrieve metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.conflicts.filter((app) => app.type === 'CustomApplication');
      // json is not sorted.  This relies on the implementation of getConflicts()
      expect(result).to.deep.equal([
        {
          type: 'CustomApplication',
          name: 'EBikes',
          path: path.resolve(path.normalize('force-app/main/default/applications/EBikes.app-meta.xml')),
          projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
          ignored: false,
          conflict: true,
          operation: 'deploy',
        },
      ]);
    });

    it('sf can see the conflict in status (deploy) ignoring conflicts', () => {
      const result = execCmd<PreviewResult>('deploy metadata preview --json -c', {
        ensureExitCode: 0,
      }).jsonOutput.result.toDeploy.filter((app) => app.type === 'CustomApplication');
      // json is not sorted.  This relies on the implementation of getConflicts()
      expect(result).to.deep.equal([
        {
          type: 'CustomApplication',
          name: 'EBikes',
          path: path.resolve(path.normalize('force-app/main/default/applications/EBikes.app-meta.xml')),
          projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
          ignored: false,
          conflict: true,
          operation: 'deploy',
        },
      ]);
    });

    it('sf can see the conflict in status (retrieve) ignoring conflicts', () => {
      const result = execCmd<PreviewResult>('retrieve metadata preview --json -c', {
        ensureExitCode: 0,
      }).jsonOutput.result.toRetrieve.filter((app) => app.type === 'CustomApplication');
      // json is not sorted.  This relies on the implementation of getConflicts()
      expect(result).to.deep.equal([
        {
          type: 'CustomApplication',
          name: 'EBikes',
          path: path.resolve(path.normalize('force-app/main/default/applications/EBikes.app-meta.xml')),
          projectRelativePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
          ignored: false,
          conflict: true,
          operation: 'deploy',
        },
      ]);
    });
  });

  it('gets conflict error on push', () => {
    execCmd<DeployResultJson>('deploy metadata --json', { ensureExitCode: 1, cli: 'sf' });
  });
  it('gets conflict error on pull', () => {
    execCmd<RetrieveResultJson>('retrieve metadata --json', { ensureExitCode: 1, cli: 'sf' });
  });
  it('can push with forceoverwrite', () => {
    execCmd<DeployResultJson>('deploy metadata --ignore-conflicts --json', { ensureExitCode: 0, cli: 'sf' });
  });
});
