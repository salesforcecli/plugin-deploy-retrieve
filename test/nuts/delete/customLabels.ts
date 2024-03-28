/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
