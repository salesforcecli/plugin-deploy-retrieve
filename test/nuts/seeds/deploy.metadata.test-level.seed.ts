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

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { assert, expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { TEST_REPOS_MAP } from '../testMatrix.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
assert(REPO);

context('deploy metadata --test-level NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: fileURLToPath(import.meta.url),
    });

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

    it('should set --test-level flag to (RunSpecifiedTests) if --tests flag is included', async () => {
      const packages = testkit.packageNames.map((p) => `--source-dir ${p}`).join(' ');
      const tests = REPO.deploy.testLevel.specifiedTests.join(',');
      await testkit.deploy({
        args: `${packages} --tests ${tests} --ignore-errors`,
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
