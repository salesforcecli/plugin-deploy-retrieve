/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { isObject } from '@salesforce/ts-types';
import { assert, expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { DeployResultJson } from '../../../../src/utils/types';

describe('deploy metadata validate NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: __filename,
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
      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
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
  });
});
