/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';
import * as path from 'node:path';
import { expect, assert, config } from 'chai';
import { Interaction, execCmd, execInteractiveCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { AuthInfo, Connection } from '@salesforce/core';
import { ensureArray } from '@salesforce/ts-types';
import { DeleteSourceJson } from '../../../src/utils/types.js';

config.truncateThreshold = 0;

const isNameObsolete = async (username: string, memberType: string, memberName: string): Promise<boolean> => {
  const connection = await Connection.create({
    authInfo: await AuthInfo.create({ username }),
  });

  const res = await connection.singleRecordQuery<{ IsNameObsolete: boolean }>(
    `SELECT IsNameObsolete FROM SourceMember WHERE MemberType='${memberType}' AND MemberName='${memberName}'`,
    { tooling: true }
  );

  return res.IsNameObsolete;
};

describe('project delete source NUTs', () => {
  let testkit: SourceTestkit;

  const queryOrgAndFS = async (name: string, fsPath: string): Promise<void> => {
    // ensure the LWC is still in the org
    expect(await isNameObsolete(testkit.username, 'LightningComponentBundle', name)).to.be.false;
    // while the helper.js file was deleted
    expect(fs.existsSync(fsPath)).to.be.false;
  };

  const createApexClass = () => {
    // create and deploy an ApexClass that can be deleted without dependency issues
    const apexName = 'myApexClass';
    const output = path.join('force-app', 'main', 'default', 'classes');
    const pathToClass = path.join(testkit.projectDir, output, `${apexName}.cls`);
    execCmd(`force:apex:class:create --classname ${apexName} --outputdir ${output} --api-version 58.0`, {
      ensureExitCode: 0,
      cli: 'sf',
    });
    execCmd(`project:deploy:start -m ApexClass:${apexName}`, { ensureExitCode: 0 });
    return { apexName, output, pathToClass };
  };

  before(async () => {
    testkit = await SourceTestkit.create({
      nut: fileURLToPath(import.meta.url),
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    });
    execCmd('project:deploy:start --source-dir force-app', { ensureExitCode: 0 });
  });

  after(async () => {
    await testkit?.clean();
  });

  it('should source:delete a static resource folder using the source-dir param', () => {
    const pathToSR = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'staticresources');
    const pathToJson = path.join(pathToSR, 'sample_data_properties.json');
    const pathToXml = path.join(pathToSR, 'sample_data_properties.resource-meta.xml');
    const response = execCmd<DeleteSourceJson>(`project:delete:source --json --no-prompt --source-dir ${pathToJson}`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(response?.deletedSource).to.have.length(2);
    expect(fs.existsSync(pathToJson)).to.be.false;
    expect(fs.existsSync(pathToXml)).to.be.false;
  });

  it('should source:delete an ApexClass using the metadata param', () => {
    const { apexName, pathToClass } = createApexClass();
    const response = execCmd<DeleteSourceJson>(
      `project:delete:source --json --no-prompt --metadata ApexClass:${apexName}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    expect(response?.deletedSource).to.have.length(2);
    expect(fs.existsSync(pathToClass)).to.be.false;
  });

  it('should source:delete an ApexClass only if a specific test pass', async () => {
    const { apexName, pathToClass } = createApexClass();
    const response = execCmd<DeleteSourceJson>(
      `project:delete:source --json --no-prompt --metadata ApexClass:${apexName} --test-level RunSpecifiedTests --tests GeocodingServiceTest`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;

    expect(response?.runTestsEnabled).to.be.true;
    expect(ensureArray(response?.details.runTestResult?.failures).length).to.equal(0);
    expect(ensureArray(response?.details.runTestResult?.successes).length).to.be.greaterThanOrEqual(1);
    expect(response?.deletedSource).to.have.length(2);
    expect(fs.existsSync(pathToClass)).to.be.false;
  });

  it('should source:delete all Prompts using the source-dir param', () => {
    const response = execCmd<DeleteSourceJson>(
      `project:delete:source --json --no-prompt --source-dir ${path.join('force-app', 'main', 'default', 'prompts')}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    const pathToPrompts = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'prompts');
    expect(response?.deletedSource).to.have.length(3);
    // should delete directory contents
    expect(fs.readdirSync(pathToPrompts).length).to.equal(0);
  });

  it('should source:delete an ApexClass using the source-dir param', () => {
    const { pathToClass } = createApexClass();
    const response = execCmd<DeleteSourceJson>(`project:delete:source --json --no-prompt --source-dir ${pathToClass}`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(response?.deletedSource).to.have.length(2);
    expect(fs.existsSync(pathToClass)).to.be.false;
  });

  it('should source:delete a remote-only ApexClass from the org', async () => {
    const { apexName, pathToClass } = createApexClass();
    const query = () =>
      execCmd<{ records: Array<{ IsNameObsolete: boolean }> }>(
        `data:query -q "SELECT IsNameObsolete FROM SourceMember WHERE MemberType='ApexClass' AND MemberName='${apexName}' LIMIT 1" -t --json`,
        { silent: true, ensureExitCode: 0, cli: 'sf' }
      );

    let soql = query().jsonOutput?.result;
    // the ApexClass is present in the org
    expect(soql?.records[0].IsNameObsolete).to.be.false;
    await testkit.deleteGlobs(['force-app/main/default/classes/myApexClass.*']);
    const response = execCmd<DeleteSourceJson>(
      `project:delete:source --json --no-prompt --metadata ApexClass:${apexName}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    // remote only delete won't have an associated filepath
    expect(response?.deletedSource).to.have.length(0);
    expect(fs.existsSync(pathToClass)).to.be.false;
    soql = query().jsonOutput?.result;
    // the apex class has been deleted in the org
    expect(soql?.records[0].IsNameObsolete).to.be.true;
  });

  it('should NOT delete local files with --checkonly', () => {
    const { apexName, pathToClass } = createApexClass();
    const response = execCmd<{ deletedSource: [{ filePath: string }]; deletes: [{ checkOnly: boolean }] }>(
      `project:delete:source --json --checkonly --no-prompt --metadata ApexClass:${apexName}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    expect(response?.deletedSource).to.have.length(2);
    expect(response?.deletes[0].checkOnly).to.be.true;
    expect(fs.existsSync(pathToClass)).to.be.true;
  });

  it('should run tests with a delete', async () => {
    const { pathToClass, apexName } = createApexClass();
    const response = execCmd<{
      checkOnly: boolean;
      runTestsEnabled: boolean;
    }>(`project:delete:source --json --testlevel RunAllTestsInOrg --no-prompt --metadata ApexClass:${apexName}`, {
      ensureExitCode: 1,
    }).jsonOutput?.result;
    // the delete operation will fail due to test failures without the 'dreamhouse' permission set assigned to the user
    expect(response?.runTestsEnabled).to.be.true;
    expect(response?.checkOnly).to.be.false;
    // ensure a failed delete attempt won't delete local files
    expect(fs.existsSync(pathToClass)).to.be.true;
  });

  it('should delete a bundle component and deploy as a "new" bundle', async () => {
    // use the brokerCard LWC
    const lwcPath = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc', 'brokerCard', 'helper.js');
    fs.writeFileSync(lwcPath, '//', { encoding: 'utf8' });
    execCmd(`project:deploy:start --source-dir ${lwcPath}`, { ensureExitCode: 0 });
    const deleteResult = execCmd<DeleteSourceJson>(`project:delete:source -p ${lwcPath} --no-prompt --json`).jsonOutput
      ?.result;
    assert(deleteResult?.deletedSource);
    expect(deleteResult.deletedSource.length).to.equal(1);
    expect(deleteResult.deletedSource[0].filePath, 'filepath').to.include(lwcPath);
    expect(deleteResult.deletedSource[0].fullName, 'fullname').to.include(path.join('brokerCard', 'helper.js'));
    expect(deleteResult.deletedSource[0].state, 'state').to.equal('Deleted');
    expect(deleteResult.deletedSource[0].type, 'type').to.equal('LightningComponentBundle');

    await queryOrgAndFS('brokerCard', lwcPath);
  });

  it('should delete a bundle component and deploy as a "new" bundle to two different bundles', async () => {
    // use the brokerCard and daysOnMarket LWC each with a helper.js file
    const lwcPath1 = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc', 'brokerCard', 'helper.js');
    const lwcPath2 = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc', 'daysOnMarket', 'helper.js');
    fs.writeFileSync(lwcPath1, '//', { encoding: 'utf8' });
    fs.writeFileSync(lwcPath2, '//', { encoding: 'utf8' });
    execCmd(`project:deploy:start --source-dir ${lwcPath1} --source-dir ${lwcPath2}`);
    // delete both helper.js files at the same time
    const deleteResult = execCmd<DeleteSourceJson>(
      // eslint-disable-next-line sf-plugin/no-execcmd-double-quotes
      `project:delete:source -p "${lwcPath1},${lwcPath2}" --no-prompt --json`
    ).jsonOutput?.result;
    assert(deleteResult?.deletedSource);

    expect(deleteResult?.deletedSource.length).to.equal(2);
    expect(deleteResult?.deletedSource[0].filePath, 'filepath').to.include(lwcPath1);
    expect(deleteResult?.deletedSource[0].fullName, 'fullname').to.include(path.join('brokerCard', 'helper.js'));
    expect(deleteResult?.deletedSource[0].state, 'state').to.equal('Deleted');
    expect(deleteResult?.deletedSource[0].type, 'type').to.equal('LightningComponentBundle');

    expect(deleteResult?.deletedSource[1].filePath, 'filepath').to.include(lwcPath2);
    expect(deleteResult?.deletedSource[1].fullName, 'fullname').to.include(path.join('daysOnMarket', 'helper.js'));
    expect(deleteResult?.deletedSource[1].state, 'state').to.equal('Deleted');
    expect(deleteResult?.deletedSource[1].type, 'type').to.equal('LightningComponentBundle');

    await queryOrgAndFS('brokerCard', lwcPath1);
    await queryOrgAndFS('daysOnMarket', lwcPath2);
  });

  it('should delete an entire LWC', async () => {
    const lwcPath = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc');
    const mylwcPath = path.join(lwcPath, 'mylwc');
    execCmd(`force:lightning:component:create -n mylwc --type lwc -d ${lwcPath}`, { ensureExitCode: 0, cli: 'sf' });
    execCmd(`project:deploy:start --source-dir ${mylwcPath}`);
    expect(await isNameObsolete(testkit.username, 'LightningComponentBundle', 'mylwc')).to.be.false;
    const deleteResult = execCmd<DeleteSourceJson>(`project:delete:source -p ${mylwcPath} --no-prompt --json`)
      .jsonOutput?.result;
    assert(deleteResult?.deletedSource);

    expect(deleteResult?.deletedSource.length).to.equal(3);
    expect(deleteResult?.deletedSource[0].filePath, 'filepath').to.include(mylwcPath);
    expect(deleteResult?.deletedSource[0].fullName, 'fullname').to.include(path.join('mylwc'));
    expect(deleteResult?.deletedSource[0].state, 'state').to.equal('Deleted');
    expect(deleteResult?.deletedSource[0].type, 'type').to.equal('LightningComponentBundle');

    expect(fs.existsSync(mylwcPath)).to.be.false;
    expect(await isNameObsolete(testkit.username, 'LightningComponentBundle', 'mylwc')).to.be.true;
  });

  it('a failed delete will NOT delete files locally', async () => {
    const lwcPath = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc');
    const brokerPath = path.join(lwcPath, 'brokerCard');
    const deleteResult = execCmd<{ deletedSource: [FileResponse & { error: string }] }>(
      `project:delete:source -p ${brokerPath} --no-prompt --json`,
      { ensureExitCode: 1 }
    ).jsonOutput?.result;

    expect(deleteResult?.deletedSource.length).to.equal(1);
    expect(deleteResult?.deletedSource[0].fullName, 'fullname').to.include(path.join('brokerCard'));
    expect(deleteResult?.deletedSource[0].state, 'state').to.equal('Failed');
    expect(deleteResult?.deletedSource[0].type, 'type').to.equal('LightningComponentBundle');
    expect(deleteResult?.deletedSource[0].error, 'error').to.include(
      'Referenced by a component instance inside the Lightning page Property Record Page : Lightning Page.'
    );

    expect(await isNameObsolete(testkit.username, 'LightningComponentBundle', 'brokerCard')).to.be.false;
    expect(fs.existsSync(brokerPath)).to.be.true;
  });

  (platform() === 'win32' ? it.skip : it)('deletes a remote-only layout using interactive prompt', async () => {
    const layoutName = 'Account-Account %28Marketing%29 Layout';
    const response = (
      await execInteractiveCmd(
        ['project:delete:source', '--metadata', `Layout:${layoutName}`],
        {
          'Are you sure': Interaction.Yes,
        },
        {
          ensureExitCode: 0,
        }
      )
    ).stdout;
    expect(response).to.include('Deleted Source');
    expect(response).to.include(layoutName);
  });
});
