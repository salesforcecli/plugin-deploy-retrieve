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

import { unlinkSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { assert, isObject } from '@salesforce/ts-types';
import { expect } from 'chai';
import { DeployResultJson, isSdrSuccess } from '../../../../src/utils/types.js';

describe('[project deploy report] NUTs with source-dir', () => {
  let testkit: SourceTestkit;

  const orgAlias = 'reportTestOrg2';

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: fileURLToPath(import.meta.url),
      scratchOrgs: [{ duration: 1, alias: orgAlias, config: join('config', 'project-scratch-def.json') }],
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--use-most-recent', () => {
    it('should report most recently started deployment', async () => {
      await testkit.execute<DeployResultJson>('project deploy start', {
        args: '--source-dir force-app --async',
        json: true,
        exitCode: 0,
      });

      const deploy = await testkit.execute<DeployResultJson>('project deploy report', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        deploy.result.files.filter(isSdrSuccess)
      );
    });
  });

  describe('--job-id', () => {
    it('should report the provided job id', async () => {
      const first = await testkit.execute<DeployResultJson>('project deploy start', {
        args: '--source-dir force-app --async --ignore-conflicts',
        json: true,
        exitCode: 0,
      });
      const deploy = await testkit.execute<DeployResultJson>('project deploy report', {
        args: `--job-id ${first?.result.id}`,
        json: true,
        exitCode: 0,
      });
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        deploy.result.files.filter(isSdrSuccess)
      );
    });

    it('should report from specified target-org and job-id without deploy cache', async () => {
      const first = await testkit.execute<DeployResultJson>('project deploy start', {
        args: `--source-dir force-app --async --target-org ${orgAlias}`,
        json: true,
        exitCode: 0,
      });

      // delete the cache file so we can verify that reporting just with job-id and org works
      const deployCacheFilePath = resolve(testkit.projectDir, join('..', '.sf', 'deploy-cache.json'));
      unlinkSync(deployCacheFilePath);
      assert(!existsSync(deployCacheFilePath));

      const deploy = await testkit.execute<DeployResultJson>('project deploy report', {
        args: `--job-id ${first?.result.id} --target-org ${orgAlias} --wait 9`,
        json: true,
        exitCode: 0,
      });
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });
  });

  describe('test flags', () => {
    it('should override the --output-dir', async () => {
      const first = await testkit.execute<DeployResultJson>('project deploy start', {
        args: '--source-dir force-app --async --ignore-conflicts --test-level RunAllTestsInOrg --coverage-formatters html --junit --results-dir test-output',
        json: true,
        exitCode: 0,
      });
      const deploy = await testkit.execute<DeployResultJson>('project deploy report', {
        args: `--job-id ${first?.result.id} --coverage-formatters html --coverage-formatters text --junit --results-dir test-output-override --wait 9`,
        json: true,
        exitCode: 0,
      });
      expect(existsSync(join(testkit.projectDir, 'test-output-override'))).to.be.true;
      expect(existsSync(join(testkit.projectDir, 'test-output-override', 'coverage'))).to.be.true;
      expect(existsSync(join(testkit.projectDir, 'test-output-override', 'coverage', 'html'))).to.be.true;
      expect(existsSync(join(testkit.projectDir, 'test-output-override', 'coverage', 'text.txt'))).to.be.true;
      expect(existsSync(join(testkit.projectDir, 'test-output-override', 'junit'))).to.be.true;
      expect(existsSync(join(testkit.projectDir, 'test-output-override', 'junit', 'junit.xml'))).to.be.true;
      expect(existsSync(join(testkit.projectDir, 'test-output'))).to.be.false;
      assert(isObject(deploy));
      await testkit.expect.filesToBeDeployedViaResult(
        ['force-app/**/*'],
        ['force-app/test/**/*'],
        deploy.result.files.filter(isSdrSuccess)
      );
    });
  });
});
