/*
 * Copyright 2025, Salesforce, Inc.
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

import path from 'node:path';
import fs from 'node:fs';
import { expect, config } from 'chai';
import { Interaction, TestSession, execCmd, execInteractiveCmd } from '@salesforce/cli-plugins-testkit';
import { type ProjectJson } from '@salesforce/schemas';
import { Messages } from '@salesforce/core/messages';
import { SourceBehaviorResult } from '../../../src/commands/project/convert/source-behavior.js';
import { DRY_RUN_DIR, PRESETS_PROP } from '../../../src/utils/convertBehavior.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.source-behavior');

config.truncateThreshold = 0;

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

  it('warns on a packageDir not using main/default', async () => {
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

    const result = await execInteractiveCmd(
      'project convert source-behavior --behavior decomposeCustomLabelsBeta',
      { Proceed: ['y', Interaction.ENTER] },
      {
        ensureExitCode: 0,
      }
    );
    expect(result.stderr).to.include(messages.getMessage('basicConfirmation'));
    expect(result.stderr).to.include(messages.getMessage('mainDefaultConfirmation'));

    expect(result.stdout).to.include('Deleted Files');
    expect(result.stdout).to.include('Created Files');
    expect(result.stdout).to.include(
      path.join(session.project.dir, 'force-app', 'main', 'default', 'labels', 'CustomLabels.labels-meta.xml')
    );
    // it modified the project json
    expect((await getProject(session))[PRESETS_PROP]).to.deep.equal(['decomposeCustomLabelsBeta']);

    // no dry run dir
    expect(fs.existsSync(path.join(session.project.dir, DRY_RUN_DIR))).to.be.false;
  });

  it("throws on repeated preset that's already done", async () => {
    const err = await execInteractiveCmd(
      'project convert source-behavior --behavior decomposeCustomLabelsBeta --json',
      {},
      {
        ensureExitCode: 1,
      }
    );
    expect(err.stdout).to.include('sourceBehaviorOptionAlreadyExists');
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
