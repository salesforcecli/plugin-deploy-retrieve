/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { TEST_REPOS_MAP } from '../testMatrix';
import { DeployResultJson } from '../../../src/utils/types';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');

context('deploy metadata --metadata NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: __filename,
    });
    // some deploys reference other metadata not included in the deploy, if it's not already in the org it will fail
    const args = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
    await testkit.deploy({ args });
    if (REPO.gitUrl.includes('dreamhouse')) {
      await testkit.assignPermissionSet({ args: '--permsetname dreamhouse' });
    }
  });

  after(async () => {
    try {
      await testkit?.clean();
    } catch (e) {
      // if the it fails to clean, don't throw so NUTs will pass
      // eslint-disable-next-line no-console
      console.log('Clean Failed: ', e);
    }
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy.join(', ')}`, async () => {
        const args = testCase.toDeploy.map((t) => `--metadata ${t}`).join(' ');
        const deploy = await testkit.deploy<DeployResultJson>({ args });

        await testkit.expect.filesToBeDeployedViaResult(testCase.toVerify, testCase.toIgnore, deploy.result.files);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await testkit.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      testkit.expect.errorToHaveName(deploy, 'SfError');
    });

    it('should not deploy metadata outside of a package directory', async () => {
      await testkit.createApexClass({ args: '--outputdir NotAPackage --classname ShouldNotBeDeployed' });
      await testkit.deploy({ args: '--metadata ApexClass' });
      // this is a glob, so no need for path.join
      await testkit.expect.filesToNotBeDeployed(['NotAPackage/**/*']);
    });
  });
});
