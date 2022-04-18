/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { DeployResult, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { DeployCache, buildComponentSet } from '../../../utils/deploy';
import { DeployReportResultFormatter } from '../../../utils/output';
import { DeployResultJson } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.report');

export default class DeployMetadataReport extends SfCommand<DeployResultJson> {
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
  };

  public async run(): Promise<DeployResultJson> {
    const flags = (await this.parse(DeployMetadataReport)).flags;
    const cache = await DeployCache.create();
    const jobId = cache.resolveLatest(flags['use-most-recent'], flags['job-id']);

    const deployOpts = cache.get(jobId);
    const org = await Org.create({ aliasOrUsername: deployOpts['target-org'] });
    const deployStatus = await org.getConnection().metadata.checkDeployStatus(jobId, true);

    const componentSet = await buildComponentSet({ ...deployOpts, wait: Duration.minutes(deployOpts.wait) });
    const result = new DeployResult(deployStatus as unknown as MetadataApiDeployStatus, componentSet);

    const formatter = new DeployReportResultFormatter(result, deployOpts);

    if (!this.jsonEnabled()) formatter.display();

    return formatter.getJson();
  }
}
