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
import fs from 'node:fs';
import path from 'node:path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { assert, config } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { DeployResultJson } from '../../../../src/utils/types.js';

config.truncateThreshold = 0;

describe('deploy metadata quick NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: fileURLToPath(import.meta.url),
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--use-most-recent', () => {
    it('should deploy previously validated deployment', async () => {
      const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });

    it.skip('should deploy previously validated deployment without specifying the flag', async () => {
      const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--source-dir force-app',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });
    it('should deploy previously validated deployment with metadata format', async () => {
      execCmd('project:convert:source --source-dir force-app --output-dir metadata');
      const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
        args: '--metadata-dir metadata',
        json: true,
        exitCode: 0,
      });
      assert(validation);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

      const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(deploy);
      await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
    });
  });

  describe('using cache', () => {
    describe('--job-id 18', () => {
      it('should deploy previously validated deployment (async)', async () => {
        const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
          args: '--source-dir force-app',
          json: true,
          exitCode: 0,
        });
        assert(validation);
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

        const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
          args: `--job-id ${validation.result.id}`,
          json: true,
          exitCode: 0,
        });
        assert(deploy);
        assert(deploy.result.id !== validation.result.id, 'deploy result ID should not be the validation ID');
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
      });

      it('should deploy previously validated deployment (poll)', async () => {
        const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
          args: '--source-dir force-app',
          json: true,
          exitCode: 0,
        });
        assert(validation);
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

        const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
          args: `--job-id ${validation.result.id} --wait 20`,
          json: true,
          exitCode: 0,
        });
        assert(deploy);
        assert(deploy.result.id !== validation.result.id, 'deploy result ID should not be the validation ID');
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
      });

      it('should fail to deploy previously deployed deployment', async () => {
        const first = await testkit.execute<DeployResultJson>('project:deploy:start', {
          args: '--source-dir force-app --ignore-conflicts',
          json: true,
          exitCode: 0,
        });
        assert(first);
        const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
          args: `--job-id ${first.result.id}`,
          json: true,
          exitCode: 1,
        });
        assert(deploy);
        testkit.expect.errorToHaveName(deploy, 'CannotQuickDeployError');
      });
    });

    describe('--job-id 15', () => {
      it('should deploy previously validated deployment (async)', async () => {
        const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
          args: '--source-dir force-app',
          json: true,
          exitCode: 0,
        });
        assert(validation);
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

        const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
          args: `--job-id ${validation.result.id?.slice(0, 15)}`,
          json: true,
          exitCode: 0,
        });
        assert(deploy);
        assert(deploy.result.id !== validation.result.id, 'deploy result ID should not be the validation ID');
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
      });
    });
  });

  describe('no cache using default org', () => {
    describe('--job-id 18', () => {
      it('should deploy previously validated deployment (async)', async () => {
        const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
          args: '--source-dir force-app',
          json: true,
          exitCode: 0,
        });
        assert(validation);
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

        await fs.promises.rm(path.join(testkit.projectDir, '..', '.sf', 'deploy-cache.json'), {
          recursive: true,
          force: true,
        });

        const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
          args: `--job-id ${validation.result.id}`,
          json: true,
          exitCode: 0,
        });
        assert(deploy);
        assert(deploy.result.id !== validation.result.id, 'deploy result ID should not be the validation ID');
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
      });

      it('should deploy previously validated deployment (poll)', async () => {
        const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
          args: '--source-dir force-app',
          json: true,
          exitCode: 0,
        });
        assert(validation);
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

        await fs.promises.rm(path.join(testkit.projectDir, '..', '.sf', 'deploy-cache.json'), {
          recursive: true,
          force: true,
        });

        const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
          args: `--job-id ${validation.result.id} --wait 20`,
          json: true,
          exitCode: 0,
        });
        assert(deploy);
        assert(deploy.result.id !== validation.result.id, 'deploy result ID should not be the validation ID');
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
      });
    });

    describe('--job-id 15', () => {
      it('should deploy previously validated deployment (async)', async () => {
        const validation = await testkit.execute<DeployResultJson>('project:deploy:validate', {
          args: '--source-dir force-app',
          json: true,
          exitCode: 0,
        });
        assert(validation);
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);

        await fs.promises.rm(path.join(testkit.projectDir, '..', '.sf', 'deploy-cache.json'), {
          recursive: true,
          force: true,
        });

        const deploy = await testkit.execute<DeployResultJson>('project:deploy:quick', {
          args: `--job-id ${validation.result.id?.slice(0, 15)}`,
          json: true,
          exitCode: 0,
        });
        assert(deploy);
        assert(deploy.result.id !== validation.result.id, 'deploy result ID should not be the validation ID');
        await testkit.expect.filesToBeDeployed(['force-app/**/*'], ['force-app/test/**/*']);
      });
    });
  });
});
