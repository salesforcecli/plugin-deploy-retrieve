/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import fs from 'node:fs';
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { type ProjectJson } from '@salesforce/schemas';
import { SourceBehaviorResult } from '../../../src/commands/project/convert/source-behavior.js';
import { DRY_RUN_DIR, PRESETS_PROP } from '../../../src/utils/convertBehavior.js';

describe('source behavior changes', () => {
  let session: TestSession;
  before(async () => {
    session = await TestSession.create({
      devhubAuthStrategy: 'NONE',
      project: {
        sourceDir: path.join(process.cwd(), 'test', 'nuts', 'customLabelProject'),
      },
    });
  });

  it.skip('produces dry run output and makes no changes', async () => {
    const originalProject = await getProject(session);
    const originalFileList = await fs.promises.readdir(path.join(session.project.dir, 'force-app'), {
      recursive: true,
    });

    const result = execCmd<SourceBehaviorResult>(
      'project convert source-behavior --behavior decomposeCustomLabelsBeta --dry-run --json',
      {
        ensureExitCode: 0,
      }
    );
    expect(result.jsonOutput?.result.deletedFiles).to.deep.equal([
      path.join(session.project.dir, 'force-app', 'main', 'default', 'labels', 'CustomLabels.labels-meta.xml'),
    ]);
    expect(result.jsonOutput?.result.createdFiles).to.have.length(4);
    result.jsonOutput?.result.createdFiles.map((f) =>
      expect(f.startsWith(path.join(session.project.dir, DRY_RUN_DIR, 'force-app', 'main', 'default')))
    );
    expect(result.jsonOutput?.result.createdFiles);
    // no change because dry run
    expect(await getProject(session)).to.deep.equal(originalProject);
    expect(await fs.promises.readdir(path.join(session.project.dir, 'force-app'), { recursive: true })).to.deep.equal(
      originalFileList
    );
    // dry run dir exists
    expect(fs.existsSync(path.join(session.project.dir, DRY_RUN_DIR, 'force-app', 'main'))).to.be.true;
    await fs.promises.rm(path.join(session.project.dir, DRY_RUN_DIR), { recursive: true });
  });

  it('throws on a packageDir not using main/default', async () => {
    const newDir = path.join(session.project.dir, 'other-dir');
    // create the new packageDir
    await fs.promises.mkdir(path.join(newDir, 'labels'), { recursive: true });
    await fs.promises.writeFile(path.join(newDir, 'labels', 'CustomLabel.labels-meta.xml'), newLabelXml);
    // add the new packageDir to the project
    const originalProject = await getProject(session);

    await fs.promises.writeFile(
      path.join(session.project.dir, 'sfdx-project.json'),
      JSON.stringify(
        {
          ...originalProject,
          packageDirectories: [...originalProject.packageDirectories, { path: 'other-dir' }],
        } satisfies ProjectJson,
        null,
        2
      )
    );

    const result = execCmd('project convert source-behavior --behavior decomposeCustomLabelsBeta --json', {
      ensureExitCode: 1,
    });
    expect(result.jsonOutput?.name).to.equal('PackageDirectoryNeedsMainDefaultError');
    // put stuff back the way it was
    await fs.promises.rm(newDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(session.project.dir, 'sfdx-project.json'),
      JSON.stringify(originalProject, null, 2)
    );
  });

  it.skip('produces actual output and makes expected changes', async () => {
    const result = execCmd<SourceBehaviorResult>(
      'project convert source-behavior --behavior decomposeCustomLabelsBeta --json',
      {
        ensureExitCode: 0,
      }
    );
    expect(result.jsonOutput?.result.deletedFiles).to.deep.equal([
      path.join(session.project.dir, 'force-app', 'main', 'default', 'labels', 'CustomLabels.labels-meta.xml'),
    ]);
    expect(result.jsonOutput?.result.createdFiles).to.have.length(4);
    // it modified the project json
    expect((await getProject(session))[PRESETS_PROP]).to.deep.equal(['decomposeCustomLabelsBeta']);

    // no dry run dir
    expect(fs.existsSync(path.join(session.project.dir, DRY_RUN_DIR))).to.be.false;
  });

  it.skip("throws on repeated preset that's already done", () => {
    const err = execCmd<SourceBehaviorResult>(
      'project convert source-behavior --behavior decomposeCustomLabelsBeta --json',
      {
        ensureExitCode: 1,
      }
    );
    expect(err.jsonOutput?.name).to.equal('sourceBehaviorOptionAlreadyExists');
  });

  after(async () => {
    await session?.clean();
  });
});

const getProject = async (session: TestSession): Promise<ProjectJson> =>
  JSON.parse(await fs.promises.readFile(path.join(session.project.dir, 'sfdx-project.json'), 'utf-8')) as ProjectJson;

const newLabelXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">
    <labels>
        <fullName>More</fullName>
        <language>en_US</language>
        <protected>true</protected>
        <shortDescription>DeleteMe</shortDescription>
        <value>More</value>
    </labels>
</CustomLabels>
`;
