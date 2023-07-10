/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { assert, isObject } from '@salesforce/ts-types';
import { expect } from 'chai';
import { DeployResultJson } from '../../../../src/utils/types';

describe('deploy metadata report NUTs with source-dir', () => {
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

  describe('--use-most-recent', () => {
    it('should report most recently started deployment', async () => {
      await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:report', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });

    it.skip('should report most recently started deployment without specifying the flag', async () => {
      await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });

      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:report', {
        json: true,
        exitCode: 0,
      });
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });
  });

  describe('--job-id', () => {
    it('should report the provided job id', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async --ignore-conflicts',
        json: true,
        exitCode: 0,
      });
      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:report', {
        args: `--job-id ${first?.result.id}`,
        json: true,
        exitCode: 0,
      });
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });
  });

  describe('test flags', () => {
    it('should override the --output-dir', async () => {
      const first = await testkit.execute<DeployResultJson>('deploy:metadata', {
        args: '--source-dir force-app --async --ignore-conflicts --test-level RunAllTestsInOrg --coverage-formatters html --junit --results-dir test-output',
        json: true,
        exitCode: 0,
      });
      const deploy = await testkit.execute<DeployResultJson>('deploy:metadata:report', {
        args: `--job-id ${first?.result.id} --coverage-formatters html --coverage-formatters text --junit --results-dir test-output-override`,
        json: true,
        exitCode: 0,
      });
      expect(fs.existsSync(path.join(testkit.projectDir, 'test-output-override'))).to.be.true;
      expect(fs.existsSync(path.join(testkit.projectDir, 'test-output-override', 'coverage'))).to.be.true;
      expect(fs.existsSync(path.join(testkit.projectDir, 'test-output-override', 'coverage', 'html'))).to.be.true;
      expect(fs.existsSync(path.join(testkit.projectDir, 'test-output-override', 'coverage', 'text.txt'))).to.be.true;
      expect(fs.existsSync(path.join(testkit.projectDir, 'test-output-override', 'junit'))).to.be.true;
      expect(fs.existsSync(path.join(testkit.projectDir, 'test-output-override', 'junit', 'junit.xml'))).to.be.true;
      expect(fs.existsSync(path.join(testkit.projectDir, 'test-output'))).to.be.false;
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployedViaResult(['force-app/**/*'], ['force-app/test/**/*'], deploy.result.files);
    });
  });
});
