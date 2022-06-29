/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { bold } from 'chalk';
import { Messages, Org } from '@salesforce/core';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import {
  buildComponentSet,
  DeployCache,
  DeployOptions,
  determineExitCode,
  poll,
  resolveApi,
} from '../../../utils/deploy';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes';
import { AsyncDeployResultFormatter, DeployResultFormatter, getVersionMessage } from '../../../utils/output';
import { API, DeployResultJson } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.quick');

export default class DeployMetadataQuick extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';

  public static flags = {
    async: Flags.boolean({
      summary: messages.getMessage('flags.async.summary'),
      description: messages.getMessage('flags.async.description'),
      exclusive: ['wait'],
    }),
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
    'target-org': Flags.optionalOrg({
      char: 'o',
      description: messages.getMessage('flags.target-org.description'),
      summary: messages.getMessage('flags.target-org.summary'),
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
      defaultValue: 33,
      helpValue: '<minutes>',
      min: 1,
      exclusive: ['async'],
    }),
  };

  public static errorCodes = toHelpSection('ERROR CODES', DEPLOY_STATUS_CODES_DESCRIPTIONS);

  public async run(): Promise<DeployResultJson> {
    const { flags } = await this.parse(DeployMetadataQuick);
    const cache = await DeployCache.create();

    const jobId = cache.resolveLatest(flags['use-most-recent'], flags['job-id'], false);

    const deployOpts = cache.get(jobId) ?? ({} as DeployOptions);
    const org = flags['target-org'] ?? (await Org.create({ aliasOrUsername: deployOpts['target-org'] }));
    const api = await resolveApi();

    await org.getConnection().deployRecentValidation({ id: jobId, rest: api === API.REST });
    const componentSet = await buildComponentSet({ ...deployOpts, wait: flags.wait });

    this.log(getVersionMessage('Deploying', componentSet, api));
    this.log(`Deploy ID: ${bold(jobId)}`);

    if (flags.async) {
      const asyncFormatter = new AsyncDeployResultFormatter(jobId);
      if (!this.jsonEnabled()) asyncFormatter.display();
      return asyncFormatter.getJson();
    }

    const result = await poll(org, jobId, flags.wait, componentSet);

    const formatter = new DeployResultFormatter(result, flags);

    if (!this.jsonEnabled()) formatter.display();

    await DeployCache.update(jobId, { status: result.response.status });

    process.exitCode = determineExitCode(result);
    if (result.response.status === RequestStatus.Succeeded) {
      this.log();
      this.logSuccess(messages.getMessage('info.QuickDeploySuccess', [jobId]));
    } else {
      this.log(messages.getMessage('error.QuickDeployFailure', [jobId, result.response.status]));
    }

    return formatter.getJson();
  }

  protected catch(error: SfCommand.Error): Promise<SfCommand.Error> {
    if (error.name.includes('INVALID_ID_FIELD')) {
      const err = messages.createError('error.CannotQuickDeploy');
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
  }
}
