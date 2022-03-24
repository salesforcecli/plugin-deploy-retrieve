/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EnvironmentVariable, Messages, Org, PollingClient, StatusResult } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { ComponentSet, DeployResult, FileResponse, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { AnyJson } from '@salesforce/ts-types';
import { buildComponentSet, DeployCache, determineExitCode, getTestResults } from '../../../utils/deploy';
import { displayDeployResults, getVersionMessage } from '../../../utils/output';
import { API, TestResults } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.quick');

export type DeployMetadataQuickResult = {
  files?: FileResponse[];
  jobId: string;
  tests?: TestResults;
};

export default class DeployMetadataQuick extends SfCommand<DeployMetadataQuickResult> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';

  public static flags = {
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
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
      unit: 'minutes',
      defaultValue: 33,
      helpValue: '<minutes>',
      min: 1,
    }),
  };

  public static envVariablesSection = toHelpSection('ENVIRONMENT VARIABLES', EnvironmentVariable.SF_TARGET_ORG);

  private org: Org;

  public async run(): Promise<DeployMetadataQuickResult> {
    const flags = (await this.parse(DeployMetadataQuick)).flags;
    const cache = await DeployCache.create();

    const jobId = flags['use-most-recent'] ? cache.getLatestKey() : flags['job-id'];
    if (!jobId && flags['use-most-recent']) throw messages.createError('error.NoRecentJobId');

    if (!cache.has(jobId)) {
      throw messages.createError('error.InvalidJobId', [jobId]);
    }

    const deployOpts = cache.get(jobId);
    this.org = await Org.create({ aliasOrUsername: deployOpts['target-org'] });

    const deploy = await this.org
      .getConnection()
      .deployRecentValidation({ id: jobId, rest: deployOpts.api === API.REST });
    const componentSet = await buildComponentSet({ ...deployOpts, wait: flags.wait });

    this.log(getVersionMessage('Deploying', componentSet, deployOpts.api));
    this.log(`Deploy ID: ${jobId}`);

    const result = await this.poll(jobId, flags.wait, componentSet);

    if (!this.jsonEnabled()) {
      displayDeployResults(result, deployOpts['test-level'], deployOpts.verbose);
    }

    await DeployCache.unset(jobId);

    this.setExitCode(result);

    return {
      jobId,
      tests: getTestResults(deploy as unknown as MetadataApiDeployStatus),
      files: result.getFileResponses() || [],
    };
  }

  protected catch(error: SfCommand.Error): Promise<SfCommand.Error> {
    if (error.name.includes('INVALID_ID_FIELD')) {
      const err = messages.createError('error.CannotQuickDeploy');
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
  }

  protected async poll(id: string, wait: Duration, componentSet: ComponentSet): Promise<DeployResult> {
    const opts: PollingClient.Options = {
      frequency: Duration.milliseconds(500),
      timeout: wait,
      poll: async (): Promise<StatusResult> => {
        const deployResult = await this.report(id, componentSet);
        return {
          completed: deployResult.response.done,
          payload: deployResult as unknown as AnyJson,
        };
      },
    };
    const pollingClient = await PollingClient.create(opts);
    return pollingClient.subscribe() as unknown as Promise<DeployResult>;
  }

  protected async report(id: string, componentSet: ComponentSet): Promise<DeployResult> {
    const res = await this.org.getConnection().metadata.checkDeployStatus(id, true);
    const deployStatus = res as unknown as MetadataApiDeployStatus;
    return new DeployResult(deployStatus as unknown as MetadataApiDeployStatus, componentSet);
  }

  private setExitCode(result: DeployResult): void {
    process.exitCode = determineExitCode(result);
  }
}
