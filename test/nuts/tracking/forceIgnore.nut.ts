/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { expect } from 'chai';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types.js';
import { PreviewResult } from '../../../src/utils/previewOutput.js';
import type { StatusResult } from './types.js';

let session: TestSession;
// leave this in posix path mode since it's used in forceignore
const classdir = 'force-app/main/default/classes';
let originalForceIgnore: string;
let conn: Connection;

describe('forceignore changes', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        name: 'forceIgnoreTest',
        apiVersion: '58.0',
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

    execCmd(`force:apex:class:create -n IgnoreTest --outputdir ${classdir} --api-version 58.0`, {
      ensureExitCode: 0,
      cli: 'sf',
    });
    originalForceIgnore = await fs.promises.readFile(path.join(session.project.dir, '.forceignore'), 'utf8');
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

  describe('local', () => {
    it('will not push a file that was created, then ignored', async () => {
      // setup a forceIgnore with some file.  forceignore uses posix style paths
      const newForceIgnore = originalForceIgnore + '\n' + `${classdir}/IgnoreTest.cls*`;
      await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), newForceIgnore);
      // nothing should push -- in sf that's an error
      const output = execCmd<DeployResultJson>('deploy:metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(output?.status).to.equal('Nothing to deploy');
    });

    it('shows the file in status as ignored', () => {
      const output = execCmd<StatusResult>('project deploy preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(output?.ignored, JSON.stringify(output)).to.deep.include({
        fullName: 'IgnoreTest',
        type: 'ApexClass',
        projectRelativePath: path.join(classdir, 'IgnoreTest.cls-meta.xml'),
        path: path.resolve(path.join(classdir, 'IgnoreTest.cls-meta.xml')),
        conflict: false,
        ignored: true,
      });
    });

    it('sf shows the file in status as ignored', () => {
      const output = execCmd<PreviewResult>('deploy metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(output?.ignored, JSON.stringify(output)).to.deep.include({
        fullName: 'IgnoreTest',
        type: 'ApexClass',
        projectRelativePath: path.join(classdir, 'IgnoreTest.cls-meta.xml'),
        path: path.resolve(path.join(classdir, 'IgnoreTest.cls-meta.xml')),
        ignored: true,
        conflict: false,
      });
    });

    it('will ignore a class in the ignore file before it was created', async () => {
      // setup a forceIgnore with some file
      const newForceIgnore =
        originalForceIgnore + '\n' + `${classdir}/UnIgnoreTest.cls` + '\n' + `${classdir}/IgnoreTest.cls*`;
      await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), newForceIgnore);

      // add a file in the local source
      execCmd(`force:apex:class:create -n UnIgnoreTest --outputdir ${classdir} --api-version 58.0`, {
        cwd: session.project.dir,
        silent: true,
        cli: 'sf',
      });
      // another error when there's nothing to push
      const output = execCmd<DeployResultJson>('deploy:metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(output?.status).to.equal('Nothing to deploy');
    });

    it('will push files that are now un-ignored', async () => {
      // un-ignore the file
      await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), originalForceIgnore);

      // verify file pushed in results
      const unIgnoredOutput = execCmd<DeployResultJson>('deploy:metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result?.files;

      // all 4 files should have been pushed
      expect(unIgnoredOutput).to.have.length(4);
      unIgnoredOutput?.map((result) => {
        expect(result.type === 'ApexClass');
        expect(result.state === ComponentStatus.Created);
      });
    });
  });

  describe('remote', () => {
    before('adds on the server and sets ignore', async () => {
      const createResult = await conn.tooling.create('ApexClass', {
        Name: 'CreatedClass',
        Body: 'public class CreatedClass {}',
        Status: 'Active',
      });
      if (!Array.isArray(createResult) && createResult.success) {
        expect(createResult.id).to.be.a('string');
      }
      // add that type to the forceignore
      await fs.promises.writeFile(
        path.join(session.project.dir, '.forceignore'),
        originalForceIgnore + '\n' + '**/classes'
      );
    });

    it('source:status recognizes ignored class', () => {
      // gets file into source tracking
      const statusOutput = execCmd<PreviewResult>('project retrieve preview --json', {
        ensureExitCode: 0,
        cli: 'sf',
      }).jsonOutput?.result;
      expect(statusOutput?.ignored.some((result) => result.fullName === 'CreatedClass')).to.equal(true);
    });

    it('metadata preview recognizes change and marks it ignored', () => {
      // gets file into source tracking
      const response = execCmd<PreviewResult>('retrieve metadata preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(
        response?.ignored.some((c) => c.fullName === 'CreatedClass' && c.type === 'ApexClass' && c.ignored === true),
        JSON.stringify(response)
      ).to.equal(true);
    });

    it('sf will not retrieve a remote file added to the ignore AFTER it is being tracked', () => {
      // pull doesn't retrieve that change
      const pullOutput = execCmd<RetrieveResultJson>('project:retrieve:start --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      // this DOES retrieve a profile modified because of the ApexClass
      expect(
        pullOutput?.files.some((result) => result.fullName === 'CreatedClass'),
        JSON.stringify(pullOutput?.files)
      ).to.equal(false);
    });

    it('exit code 0 when there are no non-ignored changes to retrieve', () => {
      const pullOutput = execCmd<RetrieveResultJson>('project:retrieve:start --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(pullOutput?.files.length).to.equal(0);
    });

    it('will not display retrieved ignored files with --concise', () => {
      // gets file into source tracking
      const output = execCmd<PreviewResult>('project:retrieve:preview --concise', {
        ensureExitCode: 0,
      }).shellOutput.stdout;
      expect(output).to.not.include("These files won't retrieve because they're ignored by your .forceignore file.");
      expect(output).to.not.include('ApexClass CreatedClass');
    });

    it('will not display deployed ignored files with --concise', async () => {
      const newForceIgnore = originalForceIgnore + '\n' + `${classdir}/IgnoreTest.cls*`;
      await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), newForceIgnore);

      const output = execCmd<DeployResultJson>(`project:deploy:preview -d ${classdir} --concise`, {
        ensureExitCode: 0,
        env: { ...process.env, SF_NO_TABLE_STYLE: 'true' },
      }).shellOutput.stdout;

      expect(output).to.include('Will Deploy [1] files.');
      expect(output).to.include('ApexClass   UnIgnoreTest');
      expect(output).to.not.include("These files won't deploy because they're ignored by your .forceignore file.");
      expect(output).to.not.include('ApexClass   IgnoreTest');
    });
  });
});
