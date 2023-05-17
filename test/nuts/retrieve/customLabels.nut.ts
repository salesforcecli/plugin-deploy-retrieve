/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types';

let session: TestSession;

describe('CustomLabel source tracking', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/WillieRuemmele/sfdx-delete-customlabel',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          duration: 1,
          setDefault: true,
          wait: 10,
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
    execCmd<DeployResultJson>('project:deploy:start --json', { ensureExitCode: 0 });
  });

  it("deletes the 'DeleteMe' CustomLabel", async () => {
    const clFile = path.join(
      session.project.dir,
      'force-app',
      'main',
      'default',
      'labels',
      'CustomLabels.labels-meta.xml'
    );
    const conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: session.orgs.get('default')?.username,
      }),
    });
    const id = (
      await conn.singleRecordQuery<{ Id: string }>("SELECT Id FROM CustomLabel WHERE name = 'DeleteMe'", {
        tooling: true,
      })
    ).Id;
    await conn.tooling.sobject('CustomLabel').delete(id);

    const result = execCmd<RetrieveResultJson>('project:retrieve:start --json', { ensureExitCode: 0 }).jsonOutput
      ?.result;
    console.log(result);
    expect(result?.fileProperties).length.to.equal(1);
    expect(fs.existsSync(clFile)).to.be.true;
    expect(fs.readFileSync(clFile, { encoding: 'utf-8' })).to.not.include('DeleteMe');
    expect(fs.readFileSync(clFile, { encoding: 'utf-8' })).to.include('KeepMe1');
  });

  it('deletes the remaining CustomLabel', async () => {
    const clFile = path.join(
      session.project.dir,
      'force-app',
      'main',
      'default',
      'labels',
      'CustomLabels.labels-meta.xml'
    );
    const conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: session.orgs.get('default')?.username,
      }),
    });
    const ids = (await conn.tooling.query<{ Id: string }>('SELECT Id FROM CustomLabel')).records.map((r) => r.Id);
    await conn.tooling.sobject('CustomLabel').delete(ids);

    const result = execCmd<RetrieveResultJson>('force:source:pull -f', { ensureExitCode: 0 }).shellOutput.stdout;
    expect(fs.existsSync(clFile)).to.be.false;
    expect(result).to.contain('KeepMe1');
    expect(result).to.contain('KeepMe2');
  });
});