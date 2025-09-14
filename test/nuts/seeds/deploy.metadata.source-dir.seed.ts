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
import { assert } from 'chai';
import { SourceTestkit } from '@salesforce/source-testkit';
import { TEST_REPOS_MAP } from '../testMatrix.js';
import { DeployResultJson, isSdrSuccess } from '../../../src/utils/types.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
assert(REPO);
context('deploy metadata --source-dir NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: fileURLToPath(import.meta.url),
    });
  });

  after(async () => {
    try {
      await testkit?.clean();
    } catch (e) {
      // if it fails to clean, don't throw so NUTs will pass
      // eslint-disable-next-line no-console
      console.log('Clean Failed: ', e);
    }
  });

  describe('--source-dir flag', () => {
    for (const testCase of REPO.deploy.sourceDir) {
      it(`should deploy ${testCase.toDeploy.join(', ')}`, async () => {
        const args = testCase.toDeploy.map((t) => `--source-dir ${path.normalize(t)}`).join(' ');
        const deploy = await testkit.deploy<DeployResultJson>({ args });
        assert(deploy);
        await testkit.expect.filesToBeDeployedViaResult(
          testCase.toVerify,
          testCase.toIgnore,
          deploy.result.files.filter(isSdrSuccess)
        );
      });
    }

    it('should throw an error if the directory does not exist', async () => {
      const deploy = await testkit.deploy({ args: '--source-dir DOES_NOT_EXIST', exitCode: 'nonZero' });
      assert(deploy);
      testkit.expect.errorToHaveName(deploy, 'SfError');
    });
  });
});
