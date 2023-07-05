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
import { DeployReportResultFormatter } from '../../../formatters/deployReportResultFormatter';
import { DeployResultJson } from '../../../utils/types';
import { coverageFormattersFlag } from '../../../utils/flags';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.report');
const testFlags = 'Test';

export default class DeployMetadataReport extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly aliases = ['deploy:metadata:report'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'job-id': Flags.salesforceId({
      char: 'i',
      startsWith: '0Af',
      length: 'both',
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
    'coverage-formatters': { ...coverageFormattersFlag, helpGroup: testFlags },
    junit: Flags.boolean({
      summary: messages.getMessage('flags.junit.summary'),
      dependsOn: ['coverage-formatters'],
      helpGroup: testFlags,
    }),
    'results-dir': Flags.directory({
      dependsOn: ['coverage-formatters'],
      summary: messages.getMessage('flags.results-dir.summary'),
      helpGroup: testFlags,
    }),
  };

  public async run(): Promise<DeployResultJson> {
    const [{ flags }, cache] = await Promise.all([this.parse(DeployMetadataReport), DeployCache.create()]);
    const jobId = cache.resolveLatest(flags['use-most-recent'], flags['job-id']);

    const deployOpts = cache.get(jobId);
    const org = await Org.create({ aliasOrUsername: deployOpts['target-org'] });
    const [deployStatus, componentSet] = await Promise.all([
      // we'll use whatever the org supports since we can't specify the org
      // eslint-disable-next-line sf-plugin/get-connection-with-version
      org.getConnection().metadata.checkDeployStatus(jobId, true),
      // if we're using mdapi, we won't have a component set
      deployOpts.isMdapi ? undefined : buildComponentSet({ ...deployOpts, wait: Duration.minutes(deployOpts.wait) }),
    ]);

    const result = new DeployResult(deployStatus as MetadataApiDeployStatus, componentSet);

    const formatter = new DeployReportResultFormatter(result, {
      ...deployOpts,
      ...flags,
      ...{ 'target-org': org },
    });

    if (!this.jsonEnabled()) formatter.display();

    return formatter.getJson();
  }
}
