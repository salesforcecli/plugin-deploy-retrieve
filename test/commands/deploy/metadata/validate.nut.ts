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

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { isObject } from '@salesforce/ts-types';
import { assert, expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { DeployResultJson, isSdrSuccess } from '../../../../src/utils/types.js';

describe('deploy metadata validate NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: fileURLToPath(import.meta.url),
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--source-dir flag', () => {
    it('should validate deploy for force-app', async () => {
      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        deploy.result.files.filter(isSdrSuccess)
      );
    });
  });

  describe('destructive flags', () => {
    it('should validate deploy with destructive changes', async () => {
      // to be able to validate a delete, the things we're deleting must be in the org
      execCmd('project deploy start -d force-app -d my-app -d foo-bar');
      // create package.xml
      execCmd('project generate manifest -p force-app');

      // create preDestructiveChanges.xml
      execCmd(`project generate manifest -p ${path.join('my-app', 'apex')} --type pre`);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--manifest package.xml --pre-destructive-changes destructiveChangesPre.xml',
        json: true,
        exitCode: 0,
      });
      expect(deploy?.result.success).to.be.true;
      expect(deploy?.result.numberComponentsDeployed).to.equal(12);
      expect(deploy?.result.checkOnly).to.be.true;

      // ensure the post-destructive-changes flag works as well
      const deployPost = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--manifest package.xml --post-destructive-changes destructiveChangesPre.xml',
        json: true,
        exitCode: 0,
      });
      expect(deployPost?.result.success).to.be.true;
      expect(deployPost?.result.numberComponentsDeployed).to.equal(12);
      expect(deployPost?.result.checkOnly).to.be.true;
    });

    it('should validate deploy with destructive changes and --ignore-warnings', async () => {
      // If you try to delete something in the org that isn't there, a warning is returned
      // so this test tries to delete an apex class that isn't in the org.

      execCmd('project deploy start -d force-app -d my-app -d foo-bar');
      // create package.xml
      execCmd('project generate manifest -p force-app');

      const destroyXmlContents = `<?xml version="1.0" encoding="UTF-8"?>
      <Package xmlns="http://soap.sforce.com/2006/04/metadata">
          <types>
              <members>NonExistantClass</members>
              <name>ApexClass</name>
          </types>
          <version>58.0</version>
      </Package>`;
      // create destroy.xml
      await testkit.writeFile(path.join(testkit.projectDir, 'destroy.xml'), destroyXmlContents);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--manifest package.xml --pre-destructive-changes destroy.xml --ignore-warnings',
        json: true,
        exitCode: 0,
      });
      expect(deploy?.result.success).to.be.true;
      expect(deploy?.result.numberComponentsDeployed).to.equal(10);
      expect(deploy?.result.checkOnly).to.be.true;
      expect(deploy?.result.ignoreWarnings).to.be.true;
    });
  });
});
