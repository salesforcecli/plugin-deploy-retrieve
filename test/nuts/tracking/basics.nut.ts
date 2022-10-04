/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import * as shelljs from 'shelljs';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { StatusResult } from '@salesforce/plugin-source/lib/formatters/source/statusFormatter';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types';
import { PreviewResult } from '../../../src/utils/previewOutput';
import { eBikesDeployResultCount } from './constants';
const filterIgnored = (r: StatusResult): boolean => r.ignored !== true;

let session: TestSession;
describe('end-to-end-test for tracking with an org (single packageDir)', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [{
        executable: 'sf',
        duration: 1,
        setDefault: true,
        config: path.join('config', 'project-scratch-def.json'),
      }]
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
      const result = execCmd<StatusResult[]>('force:source:status --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result).to.be.an.instanceof(Array);
      // the fields should be populated
      expect(result.every((row) => row.type && row.fullName)).to.equal(true);
    });
    it('detects the initial metadata status using sf', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(response.toDeploy).to.be.an.instanceof(Array);
      // the fields should be populated
      expect(response.toDeploy.every((row) => row.type && row.fullName)).to.equal(true);
      expect(response.conflicts).to.be.an.instanceof(Array).with.length(0);
    });
    it('pushes the initial metadata to the org', () => {
      const resp = execCmd<DeployResultJson>('deploy metadata --json');
      expect(resp.jsonOutput?.status, JSON.stringify(resp)).to.equal(0);
      const files = resp.jsonOutput.result.files;
      expect(files).to.be.an.instanceof(Array);
      expect(files, JSON.stringify(files.filter((f) => f.state === ComponentStatus.Failed))).to.have.length.greaterThan(
        eBikesDeployResultCount - 5
      );
      expect(files, JSON.stringify(files.filter((f) => f.state === ComponentStatus.Failed))).to.have.length.lessThan(
        eBikesDeployResultCount + 5
      );
      expect(
        files.every((f) => f.state !== ComponentStatus.Failed),
        JSON.stringify(files.filter((f) => f.state === ComponentStatus.Failed))
      ).to.equal(true);
    });
    it('sees no local changes (all were committed from push), but profile updated in remote', () => {
      const localResult = execCmd<StatusResult[]>('force:source:status --json --local', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(localResult.filter(filterIgnored)).to.deep.equal([]);

      const remoteResult = execCmd<StatusResult[]>('force:source:status --json --remote', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(remoteResult.some((item) => item.type === 'Profile')).to.equal(true);
    });

    it('sf sees no local changes (all were committed from push)', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(response.toDeploy).to.be.an.instanceof(Array).with.lengthOf(0);
    });
    it('sf sees no remote changes (all were committed from push) except Profile', () => {
      const remoteResult = execCmd<StatusResult[]>('force:source:status --json --remote', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(remoteResult.some((item) => item.type === 'Profile')).to.equal(true);
    });

    it('can pull the remote profile', () => {
      const result = execCmd<RetrieveResultJson>('retrieve metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        result.files.some((item) => item.type === 'Profile'),
        JSON.stringify(result.files)
      ).to.equal(true);
    });

    it('sees no local or remote changes', () => {
      const result = execCmd<StatusResult[]>('force:source:status --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result.filter((r) => r.type === 'Profile').filter(filterIgnored), JSON.stringify(result)).to.have.length(
        0
      );
    });

    it('sf no local changes', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;

      expect(response.toDeploy).to.be.an.instanceof(Array).with.lengthOf(0);
    });

    it('sees a local delete in local status', async () => {
      const classDir = path.join(session.project.dir, 'force-app', 'main', 'default', 'classes');
      await Promise.all([
        fs.promises.unlink(path.join(classDir, 'TestOrderController.cls')),
        fs.promises.unlink(path.join(classDir, 'TestOrderController.cls-meta.xml')),
      ]);
      const result = execCmd<StatusResult[]>('force:source:status --json --local', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result.filter(filterIgnored)).to.deep.equal([
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
      const result = execCmd<StatusResult[]>('force:source:status --json --remote', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        result.filter((r) => r.fullName === 'TestOrderController'),
        JSON.stringify(result)
      ).to.have.length(0);
    });
    it('sf does not see any change in remote status', () => {
      const result = execCmd<PreviewResult>('retrieve metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        result.toRetrieve.filter((r) => r.fullName === 'TestOrderController'),
        JSON.stringify(result)
      ).to.have.length(0);
    });

    it('pushes the local delete to the org', () => {
      const result = execCmd<DeployResultJson>('deploy metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.files;
      expect(result, JSON.stringify(result)).to.be.an.instanceof(Array).with.length(2);
    });
    it('sees no local changes', () => {
      const result = execCmd<StatusResult[]>('force:source:status --json --local', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result.filter(filterIgnored), JSON.stringify(result)).to.be.an.instanceof(Array).with.length(0);
    });

    it('sf no local changes', () => {
      const response = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;

      expect(response.toDeploy).to.be.an.instanceof(Array).with.lengthOf(0);
    });
  });

  describe('non-successes', () => {
    it('should throw an err when attempting to pull from a non scratch-org', () => {
      const hubUsername = (
        JSON.parse(shelljs.exec('sfdx force:config:get defaultdevhubusername --json', { silent: true })) as {
          result: [{ location: string; value: string }];
        }
      ).result.find((config) => config.location === 'Local').value;
      const failure = execCmd(`force:source:status -u ${hubUsername} --remote --json`, {
        ensureExitCode: 1,
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
        expect(failure).to.have.property('status', 1);
        expect(
          failure.result.files.every((r) => r.type === 'ApexClass' && r.state === 'Failed' && r.problemType === 'Error')
        ).to.equal(true);
        failure.result.files.forEach((f) => {
          if (f.state === 'Failed') {
            expect(f.lineNumber).to.exist;
            expect(f.columnNumber).to.exist;
            expect(f.error).to.be.a('string');
          }
        });
      });
      describe('classes that failed to deploy are still in local status', () => {
        it('sees no local changes', () => {
          const result = execCmd<StatusResult[]>('force:source:status --json --local', {
            ensureExitCode: 0,
          }).jsonOutput.result;
          expect(result.filter(filterIgnored), JSON.stringify(result)).to.be.an.instanceof(Array).with.length(2);
        });
        it('sf sees no local changes', () => {
          const response = execCmd<PreviewResult>('deploy metadata preview --json', {
            ensureExitCode: 0,
          }).jsonOutput?.result;

          expect(response.toDeploy).to.be.an.instanceof(Array).with.lengthOf(1);
          expect(response.toDelete).to.be.an.instanceof(Array).with.lengthOf(0);
        });
      });
    });
  });
});
