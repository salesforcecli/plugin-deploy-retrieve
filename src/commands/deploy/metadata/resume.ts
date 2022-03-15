/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EnvironmentVariable, Messages, OrgConfigProperties, SfdxPropertyKeys } from '@salesforce/core';
import { DeployResult, FileResponse, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { Duration } from '@salesforce/kit';
import { displayDeployResults, getVersionMessage } from '../../../utils/output';
import { DeployProgress } from '../../../utils/progressBar';
import { TestLevel, TestResults } from '../../../utils/types';
import { executeDeploy, getTestResults, DeployCache } from '../../../utils/deploy';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.resume');

export type DeployMetadataResumeResult = {
  files: FileResponse[];
  jobId: string;
  tests?: TestResults;
};

export default class DeployMetadataResume extends SfCommand<DeployMetadataResumeResult> {
  public static readonly hidden = true;
  public static readonly state = 'beta';
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static flags = {
    'job-id': Flags.salesforceId({
      char: 'i',
      startsWith: '0Af',
      description: messages.getMessage('flags.job-id.description'),
      summary: messages.getMessage('flags.job-id.summary'),
    }),
  };

  public static configurationVariablesSection = toHelpSection(
    'CONFIGURATION VARIABLES',
    OrgConfigProperties.TARGET_ORG,
    SfdxPropertyKeys.API_VERSION
  );

  public static envVariablesSection = toHelpSection(
    'ENVIRONMENT VARIABLES',
    EnvironmentVariable.SF_TARGET_ORG,
    EnvironmentVariable.SF_USE_PROGRESS_BAR
  );

  public async run(): Promise<DeployMetadataResumeResult> {
    const flags = (await this.parse(DeployMetadataResume)).flags;
    const cache = await DeployCache.create();
    const jobId = flags['job-id'] || cache.getLatestKey() || 'unknown';

    if (!cache.has(jobId)) {
      throw messages.createError('error.InvalidJobId', [jobId]);
    }

    const deployOpts = cache.get(jobId);
    const wait = Duration.minutes(deployOpts.wait);
    const { deploy, componentSet } = await executeDeploy({
      ...deployOpts,
      wait,
      'dry-run': false,
      'test-level': TestLevel.NoTestRun,
    });

    this.log(getVersionMessage('Resuming Deployment', componentSet, deployOpts.api));
    this.log(`Deploy ID: ${deploy.id}`);
    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, wait.seconds);
    this.setExitCode(result);

    if (!this.jsonEnabled()) {
      displayDeployResults(result, flags['test-level'], deployOpts.verbose);
    }

    cache.unset(deploy.id);
    cache.unset(jobId);
    await cache.write();

    return {
      jobId: result.response.id,
      files: result.getFileResponses() || [],
      tests: getTestResults(result),
    };
  }

  private setExitCode(result: DeployResult): void {
    if (result.response.status !== RequestStatus.Succeeded) {
      process.exitCode = 1;
    }
  }
}
