/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { assert, expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
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

  describe('test result format', () => {
    it('should run tests in org --coverage-formatters html', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');

      execCmd(`project:deploy:start ${packages} --test-level RunAllTestsInOrg --coverage-formatters html`, {
        ensureExitCode: 0,
      });
      expect(fs.existsSync(path.join(testkit.projectDir, 'coverage', 'coverage', 'html', 'index.html'))).to.be.true;
    });

    it('should run tests in org --coverage-formatters clover', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      execCmd(`project:deploy:start ${packages} --test-level RunAllTestsInOrg --coverage-formatters clover`, {
        ensureExitCode: 0,
      });
      await testkit.expect.apexTestsToBeRun();
      expect(fs.existsSync(path.join(testkit.projectDir, 'coverage', 'coverage', 'clover.xml'))).to.be.true;
    });

    it('should run tests in org --coverage-formatters json', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      execCmd(`project:deploy:start ${packages} --test-level RunAllTestsInOrg --coverage-formatters json`, {
        ensureExitCode: 0,
      });
      await testkit.expect.apexTestsToBeRun();
      expect(fs.existsSync(path.join(testkit.projectDir, 'coverage', 'coverage', 'coverage.json'))).to.be.true;
    });

    it('should run tests in org --coverage-formatters text', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      execCmd(`project:deploy:start ${packages} --test-level RunAllTestsInOrg --coverage-formatters text`, {
        ensureExitCode: 0,
      });
      await testkit.expect.apexTestsToBeRun();
      expect(fs.existsSync(path.join(testkit.projectDir, 'coverage', 'coverage', 'text.txt'))).to.be.true;
    });

    it('should run tests in org --coverage-formatters html and store in directory', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');

      execCmd(
        `project:deploy:start ${packages} --test-level RunAllTestsInOrg --coverage-formatters html --results-dir abc`,
        { ensureExitCode: 0 }
      );
      expect(fs.existsSync(path.join(testkit.projectDir, 'abc', 'coverage', 'html', 'index.html'))).to.be.true;
      await testkit.expect.apexTestsToBeRun();
    });

    it('should run tests in org --coverage-formatters html and store in directory and contain junit', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      execCmd(
        `project:deploy:start ${packages} --test-level RunAllTestsInOrg  --coverage-formatters html --results-dir abc --junit`,
        {
          ensureExitCode: 0,
        }
      );
      await testkit.expect.apexTestsToBeRun();
      expect(fs.existsSync(path.join(testkit.projectDir, 'abc', 'coverage', 'html', 'index.html'))).to.be.true;
      expect(fs.existsSync(path.join(testkit.projectDir, 'abc', 'junit', 'junit.xml'))).to.be.true;
    });

    it('should run specified tests (RunSpecifiedTests)', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      const tests = REPO.deploy.testLevel.specifiedTests.join(',');
      execCmd(`project:deploy:start ${packages} --test-level RunSpecifiedTests --tests ${tests} --ignore-errors`, {
        ensureExitCode: 0,
      });
      await testkit.expect.specificApexTestsToBeRun(REPO.deploy.testLevel.specifiedTests);
    });
  });
});
