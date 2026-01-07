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

import { expect } from 'chai';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import DeployMetadata from '../../../src/commands/project/deploy/start.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

describe('project deploy start', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  testOrg.isScratchOrg = true;
  let warnStub: sinon.SinonStub;

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });
    warnStub = stubSfCommandUx($$.SANDBOX).warn;
  });

  afterEach(() => {
    $$.restore();
  });

  it('should emit warning when PPDS=true', async () => {
    $$.setConfigStubContents('SfProjectJson', {
      contents: {
        packageDirectories: [{ path: 'force-app', default: true }],
        pushPackageDirectoriesSequentially: true,
      },
    });
    try {
      await DeployMetadata.run([]);
    } catch (e) {
      expect(warnStub.getCalls().flatMap((call: { args: string[] }) => call.args)).to.deep.include(
        messages.getMessage('pushPackageDirsWarning')
      ); // do nothing, only need to assert that it warns correctly, avoid too much UT setup
    }
  });

  it('should not emit warning when PPDS=true and flags', async () => {
    $$.setConfigStubContents('SfProjectJson', {
      contents: {
        packageDirectories: [{ path: 'force-app', default: true }],
        pushPackageDirectoriesSequentially: true,
      },
    });
    try {
      await DeployMetadata.run(['--source-dir', 'test']);
    } catch (e) {
      expect(warnStub.called).to.be.false;
      // do nothing, only need to assert that it warns correctly, avoid too much UT setup
    }
  });

  it('should not emit warning when PPDS=false and a flag', async () => {
    $$.setConfigStubContents('SfProjectJson', {
      contents: {
        packageDirectories: [{ path: 'force-app', default: true }],
        pushPackageDirectoriesSequentially: false,
      },
    });
    try {
      await DeployMetadata.run(['--source-dir', 'test']);
    } catch (e) {
      expect(warnStub.called).to.be.false;
      // do nothing, only need to assert that it warns correctly, avoid too much UT setup
    }
  });
});
