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
import * as shell from 'shelljs';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection, Messages } from '@salesforce/core';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { StatusResult } from '@salesforce/plugin-source/lib/formatters/source/statusFormatter';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types';

let session: TestSession;
// leave this in posix path mode since it's used in forceignore
const classdir = 'force-app/main/default/classes';
let originalForceIgnore: string;
let conn: Connection;

Messages.importMessagesDirectory(__dirname);

const trackingMessages = Messages.load('@salesforce/plugin-deploy-retrieve', 'tracking', ['error.noChanges']);

describe('forceignore changes', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        name: 'forceIngoreTest',
      },
      setupCommands: [
        `sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`,
        `sfdx force:apex:class:create -n IgnoreTest --outputdir ${classdir}`,
      ],
    });
    originalForceIgnore = await fs.promises.readFile(path.join(session.project.dir, '.forceignore'), 'utf8');
    conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: (session.setup[0] as { result: { username: string } }).result?.username,
      }),
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('local', () => {
    it('will not push a file that was created, then ignored', async () => {
      // setup a forceIgnore with some file
      const newForceIgnore = originalForceIgnore + '\n' + `${classdir}/IgnoreTest.cls`;
      await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), newForceIgnore);
      // nothing should push -- in sf that's an error
      const output = execCmd<DeployResultJson>('deploy:metadata --json', {
        ensureExitCode: 1,
        cli: 'sf',
      }).jsonOutput;
      expect(output.message).to.equal(trackingMessages.getMessage('error.noChanges'));
    });

    it('shows the file in status as ignored', () => {
      const output = execCmd<StatusResult>('force:source:status --json', {
        ensureExitCode: 0,
        cli: 'sfdx',
      }).jsonOutput.result;
      expect(output, JSON.stringify(output)).to.deep.include({
        state: 'Local Add',
        fullName: 'IgnoreTest',
        type: 'ApexClass',
        origin: 'Local',
        filePath: path.join(classdir, 'IgnoreTest.cls'),
        ignored: true,
        conflict: false,
        actualState: 'Add',
      });
    });

    it('will ignore a class in the ignore file before it was created', async () => {
      // setup a forceIgnore with some file
      const newForceIgnore =
        originalForceIgnore + '\n' + `${classdir}/UnIgnoreTest.cls` + '\n' + `${classdir}/IgnoreTest.cls`;
      await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), newForceIgnore);

      // add a file in the local source
      shell.exec(`sfdx force:apex:class:create -n UnIgnoreTest --outputdir ${classdir}`, {
        cwd: session.project.dir,
        silent: true,
      });
      // another error when there's nothing to push
      const output = execCmd<DeployResultJson>('deploy:metadata --json', {
        ensureExitCode: 1,
        cli: 'sf',
      }).jsonOutput;
      expect(output.message).to.equal(trackingMessages.getMessage('error.noChanges'));
    });

    it('will push files that are now un-ignored', async () => {
      // un-ignore the file
      await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), originalForceIgnore);

      // verify file pushed in results
      const unIgnoredOutput = execCmd<DeployResultJson>('deploy:metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.files;

      // all 4 files should have been pushed
      expect(unIgnoredOutput).to.have.length(4);
      unIgnoredOutput.map((result) => {
        expect(result.type === 'ApexClass');
        expect(result.state === ComponentStatus.Created);
      });
    });
  });

  describe('remote', () => {
    it('adds on the server', async () => {
      const createResult = await conn.tooling.create('ApexClass', {
        Name: 'CreatedClass',
        Body: 'public class CreatedClass {}',
        Status: 'Active',
      });
      if (!Array.isArray(createResult) && createResult.success) {
        expect(createResult.id).to.be.a('string');
      }
    });

    it('will not pull a remote file added to the ignore AFTER it is being tracked', async () => {
      // add that type to the forceignore
      await fs.promises.writeFile(
        path.join(session.project.dir, '.forceignore'),
        originalForceIgnore + '\n' + classdir
      );

      // gets file into source tracking
      const statusOutput = execCmd<StatusResult[]>('force:source:status --json --remote', {
        ensureExitCode: 0,
        cli: 'sfdx',
      }).jsonOutput.result;
      expect(statusOutput.some((result) => result.fullName === 'CreatedClass')).to.equal(true);

      // pull doesn't retrieve that change
      const pullOutput = execCmd<RetrieveResultJson>('retrieve:metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        pullOutput.files.some((result) => result.fullName === 'CreatedClass'),
        JSON.stringify(pullOutput.files)
      ).to.equal(false);
    });
  });
});
