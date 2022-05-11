/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { DeployCache, cancelDeploy, cancelDeployAsync } from '../../../utils/deploy';
import { AsyncDeployCancelResultFormatter, DeployCancelResultFormatter } from '../../../utils/output';
import { DeployResultJson } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.cancel');

export default class DeployMetadataCancel extends SfCommand<DeployResultJson> {
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
      helpValue: '<minutes>',
      min: 1,
      exclusive: ['async'],
    }),
  };

  public async run(): Promise<DeployResultJson> {
    const { flags } = await this.parse(DeployMetadataCancel);
    const cache = await DeployCache.create();
    const jobId = cache.resolveLatest(flags['use-most-recent'], flags['job-id']);

    const deployOpts = cache.get(jobId);

    if (flags.async) {
      const asyncResult = await cancelDeployAsync({ 'target-org': deployOpts['target-org'] }, jobId);
      const formatter = new AsyncDeployCancelResultFormatter(asyncResult.id);
      if (!this.jsonEnabled()) formatter.display();
      return formatter.getJson();
    } else {
      const wait = flags.wait || Duration.minutes(deployOpts.wait);
      const result = await cancelDeploy({ ...deployOpts, wait }, jobId);
      const formatter = new DeployCancelResultFormatter(result);
      if (!this.jsonEnabled()) formatter.display();

      cache.update(result.response.id, { status: result.response.status });
      await cache.write();

      return formatter.getJson();
    }
  }

  protected catch(error: SfCommand.Error): Promise<SfCommand.Error> {
    if (error.name.includes('INVALID_ID_FIELD')) {
      const err = messages.createError('error.CannotCancelDeploy');
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
  }
}
