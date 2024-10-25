/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { expect, assert } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { DeployResultJson, RetrieveResultJson, isSdrFailure, isSdrSuccess } from '../../../src/utils/types.js';
import { PreviewResult } from '../../../src/utils/previewOutput.js';
import type { StatusResult } from './types.js';
import { eBikesDeployResultCount } from './constants.js';

const filterIgnored = (r: StatusResult): boolean => r.ignored !== true;

describe('end-to-end-test for tracking with an org (single packageDir)', () => {
  let session: TestSession;

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

    // we also need to remove profiles from the forceignore
    const originalForceIgnore = await fs.promises.readFile(path.join(session.project.dir, '.forceignore'), 'utf8');
    const newForceIgnore = originalForceIgnore.replace('**/profiles/**', '');
    await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), newForceIgnore);
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('basic status and pull', () => {
    it('detects the initial metadata status', () => {
      const result = execCmd<StatusResult[]>('project deploy preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      assert(Array.isArray(result));
      // the fields should be populated
      expect(result.every((row) => row.type && row.fullName)).to.equal(true);
    });
    it('detects the initial metadata status using sf', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(response);
      assert(Array.isArray(response.toDeploy));
      // the fields should be populated
      expect(response.toDeploy.every((row) => row.type && row.fullName)).to.equal(true);
      expect(response.conflicts).to.be.an.instanceof(Array).with.length(0);
    });
    it('includes no wildcard entries', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --metadata ApexClass --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(response);
      assert(Array.isArray(response.toDeploy));
      // the fields should be populated
      expect(response.toDeploy.every((row) => row.fullName !== '*')).to.equal(true);
    });
    it('pushes the initial metadata to the org', () => {
      const resp = execCmd<DeployResultJson>('deploy metadata --json');
      expect(resp.jsonOutput?.status, JSON.stringify(resp)).to.equal(0);
      const files = resp.jsonOutput?.result.files;
      assert(Array.isArray(files));
      expect(files, JSON.stringify(files.filter(isSdrFailure))).to.have.length.greaterThan(eBikesDeployResultCount - 5);
      expect(files, JSON.stringify(files.filter(isSdrFailure))).to.have.length.lessThan(eBikesDeployResultCount + 5);
      expect(files.every(isSdrSuccess), JSON.stringify(files.filter(isSdrFailure))).to.equal(true);
    });
    it('sees no local changes (all were committed from push), but profile updated in remote', () => {
      const localResult = execCmd<StatusResult[]>('project deploy preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(localResult?.filter(filterIgnored)).to.deep.equal([]);

      const remoteResult = execCmd<StatusResult[]>('project retrieve preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(remoteResult?.some((item) => item.type === 'Profile')).to.equal(true);
    });

    it('sf sees no local changes (all were committed from push)', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(response?.toDeploy).to.be.an.instanceof(Array).with.lengthOf(0);
    });
    it('sf sees no remote changes (all were committed from push) except Profile', () => {
      const remoteResult = execCmd<StatusResult[]>('project retrieve preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(remoteResult?.some((item) => item.type === 'Profile')).to.equal(true);
    });

    it('can pull the remote profile', () => {
      const result = execCmd<RetrieveResultJson>('retrieve metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(
        result?.files.some((item) => item.type === 'Profile'),
        JSON.stringify(result?.files)
      ).to.equal(true);
    });

    it('sees no local or remote changes', () => {
      const deployResult = execCmd<StatusResult[]>('project deploy preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(
        deployResult?.filter((r) => r.type === 'Profile').filter(filterIgnored),
        JSON.stringify(result)
      ).to.have.length(0);

      const retrieveResult = execCmd<StatusResult[]>('project retrieve preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(
        retrieveResult?.filter((r) => r.type === 'Profile').filter(filterIgnored),
        JSON.stringify(result)
      ).to.have.length(0);
    });

    it('sf no local changes', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(response?.toDeploy).to.be.an.instanceof(Array).with.lengthOf(0);
    });

    it('sf deploy no local changes is not an error', () => {
      const response = execCmd<DeployResultJson>('project deploy start --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(response?.files).to.be.an.instanceof(Array).with.lengthOf(0);
    });

    it('sees a local delete in local status', async () => {
      const classDir = path.join(session.project.dir, 'force-app', 'main', 'default', 'classes');
      await Promise.all([
        fs.promises.unlink(path.join(classDir, 'TestOrderController.cls')),
        fs.promises.unlink(path.join(classDir, 'TestOrderController.cls-meta.xml')),
      ]);
      const result = execCmd<StatusResult[]>('project deploy preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(result?.filter(filterIgnored)).to.deep.equal([
        {
          type: 'ApexClass',
          state: 'Local Deleted',
          fullName: 'TestOrderController',
          filePath: path.normalize('force-app/main/default/classes/TestOrderController.cls'),
          ignored: false,
          actualState: 'Deleted',
          origin: 'Local',
        },
        {
          type: 'ApexClass',
          state: 'Local Deleted',
          fullName: 'TestOrderController',
          filePath: path.normalize('force-app/main/default/classes/TestOrderController.cls-meta.xml'),
          ignored: false,
          actualState: 'Deleted',
          origin: 'Local',
        },
      ]);
    });
    it('sf sees a local delete in local status', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(response);
      expect(response.toDeploy).to.be.an.instanceof(Array).with.lengthOf(0);
      expect(response.toDelete).to.be.an.instanceof(Array).with.lengthOf(1);
      expect(response.toDelete).deep.equals([
        {
          type: 'ApexClass',
          fullName: 'TestOrderController',
          projectRelativePath: path.normalize('force-app/main/default/classes/TestOrderController.cls-meta.xml'),
          path: path.normalize(path.resolve('force-app/main/default/classes/TestOrderController.cls-meta.xml')),
          conflict: false,
          ignored: false,
          operation: 'deletePost',
        },
      ]);
    });
    it('does not see any change in remote status', () => {
      const result = execCmd<StatusResult[]>('project retrieve preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(
        result?.filter((r) => r.fullName === 'TestOrderController'),
        JSON.stringify(result)
      ).to.have.length(0);
    });
    it('sf does not see any change in remote status', () => {
      const result = execCmd<PreviewResult>('retrieve metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(
        result?.toRetrieve.filter((r) => r.fullName === 'TestOrderController'),
        JSON.stringify(result)
      ).to.have.length(0);
    });

    it('pushes the local delete to the org', () => {
      const result = execCmd<DeployResultJson>('deploy metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result.files;
      expect(result, JSON.stringify(result)).to.be.an.instanceof(Array).with.length(2);
    });
    it('sees no local changes', () => {
      const result = execCmd<StatusResult[]>('project deploy preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(result?.filter(filterIgnored), JSON.stringify(result)).to.be.an.instanceof(Array).with.length(0);
    });

    it('sf no local changes', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;

      expect(response?.toDeploy).to.be.an.instanceof(Array).with.lengthOf(0);
    });
  });

  describe('non-successes', () => {
    it('should throw an err when attempting to pull from a non scratch-org', () => {
      const hubUsername = session.hubOrg.username;
      assert(hubUsername, 'hubUsername should be defined');
      const failure = execCmd(`project retrieve preview -u ${hubUsername} --json`, {
        ensureExitCode: 1,
        cli: 'sf',
      }).jsonOutput as unknown as { name: string };
      // command5 is removing `Error` from the end of the error names.
      expect(failure.name).to.include('NonSourceTrackedOrg');
    });

    describe('push failures', () => {
      it('writes a bad class', async () => {
        const classdir = path.join(session.project.dir, 'force-app', 'main', 'default', 'classes');
        // add a file in the local source
        await Promise.all([
          fs.promises.writeFile(path.join(classdir, 'badClass.cls'), 'bad'),
          fs.promises.writeFile(
            path.join(classdir, 'badClass.cls-meta.xml'),
            `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>53.0</apiVersion>
</ApexClass>`
          ),
        ]);
      });
      it('fails to push', () => {
        const failure = execCmd<DeployResultJson>('deploy metadata --json', {
          ensureExitCode: 1,
        }).jsonOutput;
        assert(failure && 'status' in failure);
        expect(failure).to.have.property('status', 1);
        const failureFiles = failure.result.files.filter(isSdrFailure);
        expect(failureFiles.every((r) => r.type === 'ApexClass' && r.problemType === 'Error')).to.equal(true);
        failureFiles.forEach((f) => {
          expect(f.lineNumber).to.exist;
          expect(f.columnNumber).to.exist;
          expect(f.error).to.be.a('string');
        });
      });
      describe('classes that failed to deploy are still in local status', () => {
        it('sees no local changes', () => {
          const result = execCmd<StatusResult[]>('project deploy preview --json', {
            ensureExitCode: 0,
            cli: 'sf',
          }).jsonOutput?.result;
          expect(result?.filter(filterIgnored), JSON.stringify(result)).to.be.an.instanceof(Array).with.length(2);
        });
        it('sf sees no local changes', () => {
          const response = execCmd<PreviewResult>('deploy metadata preview --json', {
            ensureExitCode: 0,
          }).jsonOutput?.result;
          assert(response);
          expect(response.toDeploy).to.be.an.instanceof(Array).with.lengthOf(1);
          expect(response.toDelete).to.be.an.instanceof(Array).with.lengthOf(0);
        });
      });
    });
  });
});
