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

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { DeleteSourceJson } from '../../../src/utils/types.js';

describe('CustomLabels', () => {
  let testkit: TestSession;

  before(async () => {
    testkit = await TestSession.create({
      project: {
        gitClone: 'https://github.com/WillieRuemmele/sfdx-delete-customlabel',
      },
      scratchOrgs: [{ setDefault: true, config: path.join('config', 'project-scratch-def.json') }],
      devhubAuthStrategy: 'AUTO',
    });
    execCmd('project:deploy:start --source-dir force-app', { ensureExitCode: 0 });
  });

  after(async () => {
    await testkit?.clean();
  });

  it('will not delete the entire .xml file', () => {
    const clPath = path.join(
      testkit.project.dir,
      'force-app',
      'main',
      'default',
      'labels',
      'CustomLabels.labels-meta.xml'
    );
    const result = execCmd<DeleteSourceJson>(
      'project:delete:source --json --no-prompt --metadata CustomLabel:DeleteMe',
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    expect(fs.existsSync(clPath)).to.be.true;
    expect(fs.readFileSync(clPath, 'utf8')).to.not.contain('<fullName>DeleteMe</fullName>');
    expect(fs.readFileSync(clPath, 'utf8')).to.contain('<fullName>KeepMe1</fullName>');
    expect(fs.readFileSync(clPath, 'utf8')).to.contain('<fullName>KeepMe2</fullName>');
    expect(result?.deletedSource).to.have.length(1);
  });

  it('will delete the entire .xml file', () => {
    const clPath = path.join(
      testkit.project.dir,
      'force-app',
      'main',
      'default',
      'labels',
      'CustomLabels.labels-meta.xml'
    );
    const result = execCmd<DeleteSourceJson>('project:delete:source --json --no-prompt --metadata CustomLabels', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.deletedSource).to.have.length(3);
    expect(fs.existsSync(clPath)).to.be.false;
  });
});
