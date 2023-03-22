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
import { buildComponentSet } from '../../../utils/deploy';
import { DeployCache } from '../../../utils/deployCache';
import { DeployReportResultFormatter } from '../../../formatters/DeployReportResultFormatter';
import { DeployResultJson, reportsFormatters } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.report');

export default class DeployMetadataReport extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';
  public static readonly aliases = ['deploy:metadata:report'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.target-org.summary'),
      required: true,
    }),
    'api-version': Flags.orgApiVersion(),
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
    'coverage-formatters': Flags.string({
      multiple: true,
      summary: messages.getMessage('flags.coverage-formatters'),
      options: reportsFormatters,
      helpValue: reportsFormatters.join(','),
    }),
    junit: Flags.boolean({ summary: messages.getMessage('flags.junit') }),
    'results-dir': Flags.directory({
      dependsOn: ['junit', 'coverage-formatters'],
      summary: messages.getMessage('flags.results-dir'),
    }),
  };

  public async run(): Promise<DeployResultJson> {
    const [{ flags }, cache] = await Promise.all([this.parse(DeployMetadataReport), DeployCache.create()]);
    const jobId = cache.resolveLatest(flags['use-most-recent'], flags['job-id']);

    const deployOpts = cache.get(jobId);
    const org = await Org.create({ aliasOrUsername: deployOpts['target-org'] });
    const deployStatus = await org.getConnection(flags['api-version']).metadata.checkDeployStatus(jobId, true);

    const componentSet = await buildComponentSet({ ...deployOpts, wait: Duration.minutes(deployOpts.wait) });
    const result = new DeployResult(deployStatus as MetadataApiDeployStatus, componentSet);

    const formatter = new DeployReportResultFormatter(result, {
      ...deployOpts,
      ...{ 'target-org': flags['target-org'] },
    });

    if (!this.jsonEnabled()) formatter.display();

    return formatter.getJson();
  }
}
