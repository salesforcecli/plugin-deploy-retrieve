/*
 * Copyright 2026, Salesforce, Inc.
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
import { assert, expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { PreviewFile, PreviewResult } from '../../../src/utils/previewOutput.js';
import { DeployResultJson } from '../../../src/utils/types.js';

let session: TestSession;
let cssPathAbsolute: string;
let cssPathRelative: string;

const filterIgnored = (r: PreviewFile): boolean => r.ignored !== true;

describe('lwc', () => {
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

    cssPathRelative = path.join('force-app', 'main', 'default', 'lwc', 'heroDetails', 'heroDetails.css');
    cssPathAbsolute = path.join(session.project.dir, cssPathRelative);
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it('pushes the repo to get source tracking started', () => {
    execCmd<DeployResultJson>('project deploy start --json', { ensureExitCode: 0 });
  });

  it('sees lwc css changes in local status', async () => {
    await fs.promises.writeFile(
      cssPathAbsolute,
      (await fs.promises.readFile(cssPathAbsolute, 'utf-8')).replace('absolute', 'relative')
    );

    const result = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    assert(result);
    // subcomponent (css file deletion) deleted turns into a Deploy of the parent component without the deleted file
    // this is a slightly different behavior than sfdx, but makes more sense
    expect(result.toDeploy, JSON.stringify(result)).to.have.lengthOf(1);
    expect(result.toDeploy.find((r) => r.fullName === 'heroDetails', JSON.stringify(result))).to.have.property(
      'operation',
      'deploy'
    );
  });

  it('pushes lwc css change', () => {
    const result = execCmd<DeployResultJson>('project deploy start --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.files;
    // we get a result for each bundle member, even though only one changed
    expect(result?.filter((r) => r.fullName === 'heroDetails')).to.have.length(4);
  });

  it('sees no local changes', () => {
    const result = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    assert(result);
    expect(result.toDeploy).to.have.length(0);
    expect(result.toRetrieve).to.have.length(0);
  });

  it("deleting an lwc sub-component should show the sub-component as 'Deleted'", async () => {
    await fs.promises.rm(cssPathAbsolute);
    const result = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    })
      .jsonOutput?.result.toDeploy.filter(filterIgnored)
      .find((r) => r.path?.endsWith('.js-meta.xml'));
    assert(result);
    // remove
    delete result.projectRelativePath;
    expect(result).to.deep.equal({
      fullName: 'heroDetails',
      type: 'LightningComponentBundle',
      operation: 'deploy',
      conflict: false,
      ignored: false,
      path: path.join(
        session.project.dir,
        'force-app',
        'main',
        'default',
        'lwc',
        'heroDetails',
        'heroDetails.js-meta.xml'
      ),
    });
  });

  it('pushes lwc subcomponent delete', () => {
    const result = execCmd<DeployResultJson>('project deploy start --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.files;
    const bundleMembers = result?.filter((r) => r.fullName === 'heroDetails');
    // TODO: these were previously corrected to show the deleted subcomponent.
    // To make sf do that, complete W-10256537 (SDR)
    // expect(bundleMembers, JSON.stringify(bundleMembers)).to.have.length(4);
    // expect(bundleMembers.filter((r) => r.state === 'Deleted')).to.have.length(1);
    expect(bundleMembers, JSON.stringify(bundleMembers)).to.have.length(3);
    expect(bundleMembers?.filter((r) => r.state === ComponentStatus['Changed'])).to.have.length(3);
  });

  it('sees no local changes', () => {
    const result = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    assert(result);
    expect(result.toDeploy).to.have.length(0);
    expect(result.toRetrieve).to.have.length(0);
  });

  it('deletes entire component locally', async () => {
    const dependentLWCPath = path.join(session.project.dir, 'force-app', 'main', 'default', 'lwc', 'hero', 'hero.html');
    // remove the component
    await fs.promises.rm(path.join(session.project.dir, 'force-app', 'main', 'default', 'lwc', 'heroDetails'), {
      recursive: true,
      force: true,
    });

    // remove a dependency on that component
    await fs.promises.writeFile(
      dependentLWCPath,
      (await fs.promises.readFile(dependentLWCPath, 'utf-8')).replace(/<c-hero.*hero-details>/s, '')
    );
    const result = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;

    assert(result);
    expect(result.toDeploy).to.deep.equal([
      {
        type: 'LightningComponentBundle',
        fullName: 'hero',
        conflict: false,
        ignored: false,
        path: path.join(session.project.dir, 'force-app', 'main', 'default', 'lwc', 'hero', 'hero.js-meta.xml'),
        projectRelativePath: path.join('force-app', 'main', 'default', 'lwc', 'hero', 'hero.js-meta.xml'),
        operation: 'deploy',
      },
    ]);
    expect(result.toDelete).to.deep.equal([
      {
        type: 'LightningComponentBundle',
        fullName: 'heroDetails',
        conflict: false,
        ignored: false,
        path: path.join(
          session.project.dir,
          'force-app',
          'main',
          'default',
          'lwc',
          'heroDetails',
          'heroDetails.js-meta.xml'
        ),
        projectRelativePath: path.join('force-app', 'main', 'default', 'lwc', 'heroDetails', 'heroDetails.js-meta.xml'),
        operation: 'deletePost',
      },
    ]);
  });

  it('push deletes the LWC remotely', () => {
    const result = execCmd<DeployResultJson>('project deploy start --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.files;
    // there'll also be changes for the changed Hero component html, but we've already tested changing a bundle member
    const bundleMembers = result?.filter((r) => r.fullName === 'heroDetails');
    expect(bundleMembers).to.have.length(3);
    expect(
      bundleMembers?.every((r) => r.state === ComponentStatus['Deleted']),
      JSON.stringify(bundleMembers, undefined, 2)
    ).to.be.true;
  });

  it('sees no local changes', () => {
    const result = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    assert(result);
    expect(result.toDeploy).to.have.length(0);
    expect(result.toRetrieve).to.have.length(0);
  });
});
