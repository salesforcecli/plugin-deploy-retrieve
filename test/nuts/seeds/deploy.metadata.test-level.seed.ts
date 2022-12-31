/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { assert } from 'chai';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
assert(REPO);

context('deploy metadata --test-level NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: __filename,
    });

    const args = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
    await testkit.deploy({ args });
    if (REPO.gitUrl.includes('dreamhouse')) {
      await testkit.assignPermissionSet({ args: '--permsetname dreamhouse', cli: 'sfdx' });
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

  describe('--test-level', () => {
    it('should run no tests (NoTestRun)', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      await testkit.deploy({ args: `${packages} --test-level NoTestRun` });
      await testkit.expect.noApexTestsToBeRun();
    });

    it('should run tests locally (RunLocalTests)', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      await testkit.deploy({ args: `${packages} --test-level RunLocalTests` });
      await testkit.expect.apexTestsToBeRun();
    });

    it('should run tests in org (RunAllTestsInOrg)', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      await testkit.deploy({ args: `${packages} --test-level RunAllTestsInOrg` });
      await testkit.expect.apexTestsToBeRun();
    });

    it('should run specified tests (RunSpecifiedTests)', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      const tests = REPO.deploy.testLevel.specifiedTests.join(',');
      await testkit.deploy({
        args: `${packages} --test-level RunSpecifiedTests --tests ${tests} --ignore-errors`,
      });
      await testkit.expect.specificApexTestsToBeRun(REPO.deploy.testLevel.specifiedTests);
    });
  });
});
