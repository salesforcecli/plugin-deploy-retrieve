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
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert, expect } from 'chai';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types.js';

describe('metadata types that go in folders', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/mshanemc/nestedFolders',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          config: path.join('config', 'project-scratch-def.json'),
          setDefault: true,
        },
      ],
    });
  });

  after(async () => {
    await session?.clean();
  });

  describe('emailTemplates', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    const getExpectedSource = (state: 'Created' | 'Changed') => [
      {
        fullName: 'Top_Level_Folder',
        type: 'EmailFolder',
        state,
        filePath: path.join('default', 'email', 'Top_Level_Folder.emailFolder-meta.xml'),
      },
      {
        fullName: 'Top_Level_Folder/Template_in_folder',
        type: 'EmailTemplate',
        state,
        filePath: path.join('email', 'Top_Level_Folder', 'Template_in_folder.email'),
      },
      {
        fullName: 'Top_Level_Folder/Template_in_folder',
        type: 'EmailTemplate',
        state,
        filePath: path.join('email', 'Top_Level_Folder', 'Template_in_folder.email-meta.xml'),
      },
      {
        fullName: 'unfiled$public/Top_level_email',
        type: 'EmailTemplate',
        state,
        filePath: path.join('email', 'unfiled$public', 'Top_level_email.email'),
      },
      {
        fullName: 'unfiled$public/Top_level_email',
        type: 'EmailTemplate',
        state,
        filePath: path.join('email', 'unfiled$public', 'Top_level_email.email-meta.xml'),
      },
    ];

    const getRelativeFileResponses = (resp: FileResponse[]) =>
      resp.map((fr) => ({
        ...fr,
        filePath: fr.filePath?.split(path.sep).slice(-3).join(path.sep),
      }));

    it('can generate manifest for just the emailTemplates', () => {
      const pathToEmails = path.join('force-app', 'main', 'default', 'email');
      execCmd(`force:source:manifest:create -p ${pathToEmails} --json`, {
        ensureExitCode: 0,
      });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('can deploy email templates via the manifest', () => {
      const deployResults = execCmd<DeployResultJson>('project deploy start -x package.xml --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(deployResults?.files);
      const deployedSource = getRelativeFileResponses(deployResults.files);
      expect(deployedSource).to.have.deep.members(getExpectedSource('Created'));
    });

    it('can retrieve email templates via the manifest', () => {
      const retrieveResults = execCmd<RetrieveResultJson>('project retrieve start -x package.xml --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(retrieveResults?.files);
      const retrievedSource = getRelativeFileResponses(retrieveResults.files);
      expect(retrievedSource).to.have.deep.members(getExpectedSource('Changed'));
    });
  });

  describe('reports', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    it('can generate manifest for just the reports', () => {
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.false;
      const pathToReports = path.join('force-app', 'main', 'default', 'reports');
      execCmd(`force:source:manifest:create -p ${pathToReports} --json`, {
        ensureExitCode: 0,
      });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('can deploy reports via the manifest', () => {
      execCmd('project deploy start -x package.xml --json', { ensureExitCode: 0 });
    });

    it('can retrieve reports via the manifest', () => {
      execCmd('project retrieve start -x package.xml --json', { ensureExitCode: 0 });
    });
  });
});
