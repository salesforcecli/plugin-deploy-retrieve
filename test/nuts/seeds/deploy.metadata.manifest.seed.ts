/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { assert } from 'chai';
import { TEST_REPOS_MAP } from '../testMatrix.js';
import { DeployResultJson } from '../../../src/utils/types.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
assert(REPO);
context('deploy metadata --manifest NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

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

  describe('--manifest flag', () => {
    for (const testCase of REPO.deploy.manifest) {
      it(`should deploy ${testCase.toDeploy.join(', ')}`, async () => {
        const paths = testCase.toDeploy.map((t) => path.normalize(t)).join(',');
        // This is using the force:source:convert command from plugin-source. Once we have an
        // sf equivalent, we should switch it to use that.
        await testkit.convert({ args: `--sourcepath ${paths} --outputdir out` });
        const packageXml = path.join('out', 'package.xml');

        const deploy = await testkit.deploy<DeployResultJson>({ args: `--manifest ${packageXml}` });
        assert(deploy);
        await testkit.expect.filesToBeDeployedViaResult(testCase.toVerify, testCase.toIgnore, deploy.result.files);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const deploy = await testkit.deploy({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      assert(deploy);
      testkit.expect.errorToHaveName(deploy, 'Error');
      testkit.expect.errorToHaveMessage(deploy, 'No file found at DOES_NOT_EXIST.xml');
    });
  });
});
