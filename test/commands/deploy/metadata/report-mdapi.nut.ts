/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { assert, expect } from 'chai';
import { DeployResultJson } from '../../../../src/utils/types';

describe('deploy metadata report NUTs with source-dir', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: __filename,
    });
    await testkit.convert({
      args: '--source-dir force-app --output-dir mdapiOut',
      json: true,
      exitCode: 0,
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--use-most-recent', () => {
    it('should report most recently started deployment', async () => {
      await testkit.execute<DeployResultJson>('project deploy start', {
        args: '--metadata-dir mdapiOut --async',
        json: true,
        exitCode: 0,
      });

      const deploy = await testkit.execute<DeployResultJson>('project deploy report', {
        args: '--use-most-recent',
        json: true,
        exitCode: 0,
      });
      assert(deploy?.result);
      expect(deploy.result.success).to.equal(true);
    });

    it.skip('should report most recently started deployment without specifying the flag', async () => {
      await testkit.execute<DeployResultJson>('project deploy start', {
        args: '--metadata-dir mdapiOut --async',
        json: true,
        exitCode: 0,
      });

      const deploy = await testkit.execute<DeployResultJson>('project deploy report', {
        json: true,
        exitCode: 0,
      });
      assert(deploy?.result);
      expect(deploy.result.success).to.equal(true);
    });
  });

  describe('--job-id', () => {
    it('should report the provided job id', async () => {
      const first = await testkit.execute<DeployResultJson>('project deploy start', {
        args: '--metadata-dir mdapiOut --async',
        json: true,
        exitCode: 0,
      });
      const deploy = await testkit.execute<DeployResultJson>('project deploy report', {
        args: `--job-id ${first?.result.id}`,
        json: true,
        exitCode: 0,
      });
      assert(deploy?.result);
      expect(deploy.result.success).to.equal(true);
      expect(deploy.result.id).to.equal(first?.result.id);
    });
  });
});
