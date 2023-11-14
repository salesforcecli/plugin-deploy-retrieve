/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable no-console */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { JsonMap } from '@salesforce/ts-types';
import { assert } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
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
    console.log('before is done.  project/repo created');
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
        console.log('converting first paths: ', paths);
        execCmd(`force:source:convert --sourcepath ${paths} --outputdir out`, {
          ensureExitCode: 0,
          cwd: testkit.projectDir,
        });
        // await testkit.convert({ args: `--sourcepath ${paths} --outputdir out` });
        console.log('converting done: ', paths);
        console.log('deploying using mdapi');

        const deploy = await testkit.deploy<DeployResultJson>({ args: '--metadata-dir out' });
        console.log('deploying complete');
        assert(deploy);
        testkit.expect.toHavePropertyAndValue(deploy.result as unknown as JsonMap, 'status', RequestStatus.Succeeded);
      });
    }
    it('should throw an error if the directory does not exist', async () => {
      console.log('deploying a bad one');
      const deploy = await testkit.deploy({ args: '--metadata-dir DOES_NOT_EXIST', exitCode: 1 });
      console.log('deploying done');
      assert(deploy);
      testkit.expect.errorToHaveName(deploy, 'InvalidFlagPathError');
    });
  });
});
