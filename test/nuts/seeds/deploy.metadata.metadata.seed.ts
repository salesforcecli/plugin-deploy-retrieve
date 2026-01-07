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

import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { assert } from 'chai';
import { TEST_REPOS_MAP } from '../testMatrix.js';
import { DeployResultJson, isSdrSuccess } from '../../../src/utils/types.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');

context('deploy metadata --metadata NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;
  assert(REPO);
  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: fileURLToPath(import.meta.url),
    });
    // some deploys reference other metadata not included in the deploy, if it's not already in the org it will fail
    const args = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
    await testkit.deploy({ args });
    if (REPO.gitUrl.includes('dreamhouse')) {
      await testkit.assignPermissionSet({ args: '--permsetname dreamhouse', cli: 'sf' });
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
        assert(deploy);
        await testkit.expect.filesToBeDeployedViaResult(
          testCase.toVerify,
          testCase.toIgnore,
          deploy.result.files.filter(isSdrSuccess)
        );
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await testkit.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      assert(deploy);
    });

    it('should not deploy metadata outside of a package directory', async () => {
      await testkit.createApexClass({ args: '--outputdir NotAPackage --classname ShouldNotBeDeployed', cli: 'sf' });
      await testkit.deploy({ args: '--metadata ApexClass' });
      // this is a glob, so no need for path.join
      await testkit.expect.filesToNotBeDeployed(['NotAPackage/**/*']);
    });
  });
});
