/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EnvironmentVariable, Messages } from '@salesforce/core';
import { DeployResult, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { Duration } from '@salesforce/kit';
import { DeployResultFormatter, getVersionMessage } from '../../../utils/output';
import { DeployProgress } from '../../../utils/progressBar';
import { DeployResultJson } from '../../../utils/types';
import { DeployCache, determineExitCode, executeDeploy } from '../../../utils/deploy';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.resume');

export default class DeployMetadataResume extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';

  public static flags = {
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
      exclusive: ['verbose'],
    }),
    'job-id': Flags.salesforceId({
      char: 'i',
      startsWith: '0Af',
      description: messages.getMessage('flags.job-id.description'),
      summary: messages.getMessage('flags.job-id.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
    'use-most-recent': Flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.use-most-recent.description'),
      summary: messages.getMessage('flags.use-most-recent.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
      exclusive: ['concise'],
    }),
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
      unit: 'minutes',
      helpValue: '<minutes>',
      min: 1,
    }),
  };

  public static envVariablesSection = toHelpSection('ENVIRONMENT VARIABLES', EnvironmentVariable.SF_USE_PROGRESS_BAR);

  public static errorCodes = toHelpSection('ERROR CODES', DEPLOY_STATUS_CODES_DESCRIPTIONS);

  public async run(): Promise<DeployResultJson> {
    const { flags } = await this.parse(DeployMetadataResume);
    const cache = await DeployCache.create();

    const jobId = flags['use-most-recent'] ? cache.getLatestKey() : flags['job-id'];
    if (!jobId && flags['use-most-recent']) throw messages.createError('error.NoRecentJobId');

    if (!cache.has(jobId)) {
      throw messages.createError('error.InvalidJobId', [jobId]);
    }

    const deployOpts = cache.get(jobId);
    const wait = flags.wait || Duration.minutes(deployOpts.wait);
    const { deploy, componentSet } = await executeDeploy({ ...deployOpts, wait, 'dry-run': false }, jobId);

    this.log(getVersionMessage('Resuming Deployment', componentSet, deployOpts.api));
    this.log(`Deploy ID: ${deploy.id}`);
    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, wait.seconds);
    this.setExitCode(result);

    const formatter = new DeployResultFormatter(result, {
      ...flags,
      verbose: deployOpts.verbose,
      concise: deployOpts.concise,
    });

    if (!this.jsonEnabled()) formatter.display();

    if (result.response.status === RequestStatus.Succeeded) {
      cache.unset(deploy.id);
      cache.unset(jobId);
      await cache.write();
    }

    return formatter.getJson();
  }

  private setExitCode(result: DeployResult): void {
    process.exitCode = determineExitCode(result);
  }
}
