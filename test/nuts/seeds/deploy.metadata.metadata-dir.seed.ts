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
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { JsonMap } from '@salesforce/ts-types';
import { assert } from 'chai';
import { TEST_REPOS_MAP } from '../testMatrix.js';
import { DeployResultJson } from '../../../src/utils/types.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
assert(REPO);
context('deploy metadata --metadata-dir NUTs [name: %REPO_NAME%]', () => {
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

  describe('--metadata-dir flag', () => {
    for (const testCase of REPO.deploy.metadataDir ?? []) {
      it(`should deploy ${testCase.toDeploy.join(', ')}`, async () => {
        const paths = testCase.toDeploy.map((t) => path.normalize(t)).join(',');
        // This is using the force:source:convert command from plugin-source. Once we have an
        // sf equivalent, we should switch it to use that.
        await testkit.convert({ args: `--sourcepath ${paths} --outputdir out` });

        const deploy = await testkit.deploy<DeployResultJson>({ args: '--metadata-dir out' });
        assert(deploy);
        testkit.expect.toHavePropertyAndValue(deploy.result as unknown as JsonMap, 'status', RequestStatus.Succeeded);
      });
    }

    it('should throw an error if the directory does not exist', async () => {
      const deploy = await testkit.deploy({ args: '--metadata-dir DOES_NOT_EXIST', exitCode: 'nonZero' });
      assert(deploy);
      testkit.expect.errorToHaveName(deploy, 'InvalidFlagPathError');
    });
  });
});
