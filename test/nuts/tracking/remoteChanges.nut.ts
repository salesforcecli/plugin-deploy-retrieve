/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { expect, assert, config } from 'chai';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import type { FileResponse } from '@salesforce/source-deploy-retrieve';
import type { PreviewResult, PreviewFile } from '../../../src/utils/previewOutput.js';
import { DeployResultJson, isSdrFailure, isSdrSuccess, RetrieveResultJson } from '../../../src/utils/types.js';
import { eBikesDeployResultCount } from './constants.js';

let session: TestSession;
let conn: Connection;

config.truncateThreshold = 0;

const filterIgnored = (r: PreviewFile): boolean => r.ignored !== true;
const noAudience = (pf: PreviewFile | FileResponse) => pf.type !== 'Audience';
const noReportType = (pf: PreviewFile | FileResponse) => pf.type !== 'ReportType';

describe('remote changes', () => {
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

  describe('remote changes: delete', () => {
    it('pushes to initiate the remote', () => {
      const pushResult = execCmd<DeployResultJson>('deploy metadata --json');
      expect(pushResult.jsonOutput?.status, JSON.stringify(pushResult)).equals(0);
      const pushedSource = pushResult.jsonOutput?.result.files;
      assert(Array.isArray(pushedSource));
      expect(pushedSource, JSON.stringify(pushedSource)).to.have.length.greaterThan(eBikesDeployResultCount - 5);
      expect(pushedSource, JSON.stringify(pushedSource)).to.have.length.lessThan(eBikesDeployResultCount + 5);
      expect(pushedSource.every(isSdrSuccess), JSON.stringify(pushedSource.filter(isSdrFailure))).to.equal(true);
    });

    it('sees no local changes (all were committed from deploy)', () => {
      const localResult = execCmd<PreviewResult>('project deploy preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(localResult?.toDeploy.filter(filterIgnored)).to.deep.equal([]);
    });

    it('sees no local changes (all were committed from deploy)', () => {
      const localResult = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(localResult);
      expect(localResult.toDeploy).to.deep.equal([]);
      expect(localResult.toDelete).to.deep.equal([]);
    });

    it('deletes on the server', async () => {
      const testClass = await conn.singleRecordQuery<{ Id: string }>(
        "select Id from ApexClass where Name = 'TestOrderController'",
        {
          tooling: true,
        }
      );
      const deleteResult = await conn.tooling.delete('ApexClass', testClass.Id);
      if (!Array.isArray(deleteResult) && deleteResult.success) {
        expect(deleteResult.id).to.be.a('string');
      }
    });
    it('local file is present', () => {
      expect(
        fs.existsSync(
          path.join(session.project.dir, 'force-app', 'main', 'default', 'classes', 'TestOrderController.cls')
        )
      ).to.equal(true);
      expect(
        fs.existsSync(
          path.join(session.project.dir, 'force-app', 'main', 'default', 'classes', 'TestOrderController.cls-meta.xml')
        )
      ).to.equal(true);
    });

    it('can see the delete in status', () => {
      const result = execCmd<PreviewResult>('retrieve metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      // it shows up as one class on the server, but 2 files when pulled
      expect(result?.toDelete, JSON.stringify(result)).to.have.length(1);
    });

    it('does not see any change in local status', () => {
      const result = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(result?.toDeploy).to.deep.equal([]);
    });
    it('can pull the delete', () => {
      const result = execCmd<RetrieveResultJson>('project:retrieve:start --json', { ensureExitCode: 0 }).jsonOutput
        ?.result;
      assert(result);
      assert(Array.isArray(result.files));
      const filteredResult = result.files.filter(noAudience).filter(noReportType);
      // the 2 files for the apexClass, and possibly one for the Profile (depending on whether it got created in time)

      expect(filteredResult).to.have.length.greaterThanOrEqual(2).and.lessThanOrEqual(4);

      result.files.filter((r) => r.fullName === 'TestOrderController').map((r) => expect(r.state).to.equal('Deleted'));
    });
    it('local file was deleted', () => {
      expect(
        fs.existsSync(
          path.join(session.project.dir, 'force-app', 'main', 'default', 'classes', 'TestOrderController.cls')
        )
      ).to.equal(false);
      expect(
        fs.existsSync(
          path.join(session.project.dir, 'force-app', 'main', 'default', 'classes', 'TestOrderController.cls-meta.xml')
        )
      ).to.equal(false);
    });
    it('sees correct local and remote status', () => {
      const remoteResult = execCmd<PreviewResult>('project retrieve preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(remoteResult?.toRetrieve.filter((r) => r.operation?.includes('Remote Deleted'))).to.deep.equal([]);

      const localStatus = execCmd<PreviewResult>('project deploy preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(localStatus?.toDeploy.filter(filterIgnored)).to.deep.equal([]);
    });
    it('sees correct local status', () => {
      const result = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(result?.toDeploy).to.deep.equal([]);
    });
    it('sees correct remote status', () => {
      const result = execCmd<PreviewResult>('retrieve metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      // Audience created as a side effect of experiences
      expect(result?.toRetrieve.filter(noAudience)).to.deep.equal([]);
    });
  });

  describe('remote changes: add', () => {
    const className = 'Class1';
    it('adds on the server', async () => {
      const createResult = await conn.tooling.create('ApexClass', {
        Name: className,
        Body: `public class ${className} {}`,
        Status: 'Active',
      });
      if (!Array.isArray(createResult) && createResult.success) {
        expect(createResult.id).to.be.a('string');
      }
    });
    it('can see the add in status', () => {
      const result = execCmd<PreviewResult>('project retrieve preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(
        result?.toRetrieve.some((r) => r.fullName === className),
        JSON.stringify(result)
      ).to.equal(true);
    });
    it('can see the add in status', () => {
      const result = execCmd<PreviewResult>('retrieve metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(
        result?.toRetrieve.some((r) => r.fullName === className),
        JSON.stringify(result)
      ).to.equal(true);
    });
    it('can pull the add', () => {
      const result = execCmd<RetrieveResultJson>('project:retrieve:start --json', { ensureExitCode: 0 }).jsonOutput
        ?.result;
      // SDR marks all retrieves as 'Changed' even if it creates new local files.  This is different from toolbelt, which marked those as 'Created'
      result?.files
        .filter((r) => r.fullName === className)
        .map((r) => expect(r.state, JSON.stringify(r)).to.equal('Created'));
    });
    describe('check status', () => {
      it('sees correct remote status', () => {
        const result = execCmd<PreviewResult>('retrieve metadata preview  --json', {
          ensureExitCode: 0,
        }).jsonOutput?.result;
        expect(
          result?.toRetrieve.filter((r) => r.fullName === className),
          JSON.stringify(result)
        ).deep.equal([]);
      });
      it('sees correct local status', () => {
        const result = execCmd<PreviewResult>('deploy metadata preview --json', {
          ensureExitCode: 0,
        }).jsonOutput?.result;
        assert(result);
        expect(result.toDeploy).to.deep.equal([]);
        expect(result.toDelete).to.deep.equal([]);
      });
    });
  });

  describe('remote changes: apiVersion', () => {
    let originalProject: { sourceApiVersion: string };
    let originalProjectSourceApiVersion: string;
    before(async () => {
      originalProject = JSON.parse(
        await fs.promises.readFile(path.join(session.project.dir, 'sfdx-project.json'), 'utf8')
      ) as {
        sourceApiVersion: string;
      };
      originalProjectSourceApiVersion = originalProject.sourceApiVersion;
    });

    it('adds on the server', async () => {
      const className = 'Class2';
      const createResult = await conn.tooling.create('ApexClass', {
        Name: className,
        Body: `public class ${className} {}`,
        Status: 'Active',
      });
      if (!Array.isArray(createResult) && createResult.success) {
        expect(createResult.id).to.be.a('string');
      }
    });
    it('can pull the update using current project apiVersion', () => {
      const result = execCmd<RetrieveResultJson>('project:retrieve:start', { ensureExitCode: 0 }).shellOutput;
      expect(result).to.include(`v${originalProjectSourceApiVersion} metadata`);
    });

    it('adds on the server', async () => {
      const className = 'Class3';
      const createResult = await conn.tooling.create('ApexClass', {
        Name: className,
        Body: `public class ${className} {}`,
        Status: 'Active',
      });
      if (!Array.isArray(createResult) && createResult.success) {
        expect(createResult.id).to.be.a('string');
      }
    });

    it('can pull the update using a lower apiVersion', async () => {
      const newApiVersion = originalProjectSourceApiVersion
        .split('.')
        .map((v, i) => (i === 0 ? (parseInt(v, 10) - 1).toString() : v))
        .join('.');
      await fs.promises.writeFile(
        path.join(session.project.dir, 'sfdx-project.json'),
        JSON.stringify({ ...originalProject, sourceApiVersion: newApiVersion })
      );
      const result = execCmd<RetrieveResultJson>('project:retrieve:start', { ensureExitCode: 0 }).shellOutput;
      expect(result).to.include(`v${newApiVersion} metadata`);
    });
  });

  describe('remote changes: mixed', () => {
    it('all three types of changes on the server');
    it('can see the changes in status');
    it('can pull the changes');
    it('sees correct local and remote status');
  });
});
