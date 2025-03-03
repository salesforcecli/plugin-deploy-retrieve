/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'node:path';
import * as fs from 'node:fs';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { AuthInfo, Connection } from '@salesforce/core';
import { DeleteTrackingResult } from '../../../src/commands/project/delete/tracking.js';
import { PreviewResult } from '../../../src/utils/previewOutput.js';

let session: TestSession;
let orgId: string;
let trackingFileFolder: string;
let conn: Connection;

// copy/pasted here to avoid exporting this type from STL
type MemberRevision = {
  serverRevisionCounter: number;
  lastRetrievedFromServer: number | null;
  memberType: string;
  isNameObsolete: boolean;
};

const getRevisionsAsArray = async (): Promise<MemberRevision[]> => {
  const revisionFile = JSON.parse(
    await fs.promises.readFile(path.join(trackingFileFolder, 'maxRevision.json'), 'utf8')
  ) as { sourceMembers: { [key: string]: MemberRevision } };
  return Object.values(revisionFile.sourceMembers);
};

describe('reset and clear tracking', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          duration: 1,
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });

    orgId = session.orgs.get('default')?.orgId as string;
    trackingFileFolder = path.join(session?.project.dir, '.sf', 'orgs', orgId);
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

  describe('clearing tracking', () => {
    it('runs status to start tracking', () => {
      const result = execCmd<PreviewResult>('project deploy preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      // dreamhouse-lwc is big
      expect(result?.toDeploy).to.have.length.greaterThan(75);
    });

    it('local tracking file exists', () => {
      expect(fs.existsSync(path.join(trackingFileFolder, 'localSourceTracking'))).to.equal(true);
    });
    it('remote tracking file exists', () => {
      expect(fs.existsSync(path.join(trackingFileFolder, 'maxRevision.json'))).to.equal(true);
    });
    it('runs clear', () => {
      const clearResult = execCmd<DeleteTrackingResult>('force:source:tracking:clear --no-prompt --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(clearResult?.clearedFiles.some((file) => file.includes('maxRevision.json'))).to.equal(true);
    });
    it('local tracking is gone', () => {
      expect(fs.existsSync(path.join(trackingFileFolder, 'localSourceTracking'))).to.equal(false);
    });
    it('remote tracking is gone', () => {
      expect(fs.existsSync(path.join(trackingFileFolder, 'maxRevision.json'))).to.equal(false);
    });
  });

  describe('reset remote tracking', () => {
    let lowestRevision = 0;
    it('creates 2 apex classes to get some tracking going', async () => {
      const createResult = await conn.tooling.create('ApexClass', {
        Name: 'CreatedClass',
        Body: 'public class CreatedClass {}',
        Status: 'Active',
      });
      const createResult2 = await conn.tooling.create('ApexClass', {
        Name: 'CreatedClass2',
        Body: 'public class CreatedClass2 {}',
        Status: 'Active',
      });
      [createResult, createResult2].map((result) => {
        if (!Array.isArray(result)) {
          expect(result.success).to.equal(true);
        }
      });
      // gets tracking files from server
      execCmd('project retrieve preview --json', { ensureExitCode: 0, cli: 'sf' });
      const revisions = await getRevisionsAsArray();
      const revisionFile = JSON.parse(
        await fs.promises.readFile(path.join(trackingFileFolder, 'maxRevision.json'), 'utf8')
      ) as { serverMaxRevisionCounter: number };
      lowestRevision = revisions.reduce<number>(
        (previousValue: number, revision) => Math.min(previousValue, revision.serverRevisionCounter),
        revisionFile.serverMaxRevisionCounter
      );
      expect(lowestRevision).lessThan(revisionFile.serverMaxRevisionCounter);
      // revisions are not retrieved
      revisions.map((revision) => {
        expect(revision.serverRevisionCounter).to.not.equal(revision.lastRetrievedFromServer);
        expect(revision.lastRetrievedFromServer).to.equal(null);
      });
    });
    it('can reset to a known revision', async () => {
      execCmd(`force:source:tracking:reset --revision ${lowestRevision} --no-prompt`, {
        ensureExitCode: 0,
      });
      const revisions = await getRevisionsAsArray();

      revisions.map((revision) => {
        revision.serverRevisionCounter === lowestRevision
          ? expect(revision.serverRevisionCounter, JSON.stringify(revision)).to.equal(revision.lastRetrievedFromServer)
          : expect(revision.serverRevisionCounter, JSON.stringify(revision)).to.not.equal(
              revision.lastRetrievedFromServer
            );
      });
    });

    it('can reset to a non-specified revision (resets everything)', async () => {
      execCmd(`force:source:tracking:reset --revision ${lowestRevision} --no-prompt`, {
        ensureExitCode: 0,
      });
      const revisions = await getRevisionsAsArray();

      revisions.map((revision) => {
        expect(revision.serverRevisionCounter === revision.lastRetrievedFromServer).to.equal(true);
      });
    });
  });
});
