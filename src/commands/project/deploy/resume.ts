/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { bold } from 'chalk';
import { EnvironmentVariable, Messages } from '@salesforce/core';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { Duration } from '@salesforce/kit';
import { getVersionMessage } from '../../../utils/output';
import { DeployResultFormatter } from '../../../formatters/deployResultFormatter';
import { DeployProgress } from '../../../utils/progressBar';
import { DeployResultJson, reportsFormatters } from '../../../utils/types';
import { determineExitCode, executeDeploy, isNotResumable } from '../../../utils/deploy';
import { DeployCache } from '../../../utils/deployCache';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.resume');

export default class DeployMetadataResume extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';
  public static readonly aliases = ['deploy:metadata:resume'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
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
    // we want this to allow undefined so that we can use the default value from the cache
    // eslint-disable-next-line sf-plugin/flag-min-max-default
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
      unit: 'minutes',
      helpValue: '<minutes>',
      min: 1,
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

  public static envVariablesSection = toHelpSection('ENVIRONMENT VARIABLES', EnvironmentVariable.SF_USE_PROGRESS_BAR);

  public static errorCodes = toHelpSection('ERROR CODES', DEPLOY_STATUS_CODES_DESCRIPTIONS);

  public async run(): Promise<DeployResultJson> {
    const [{ flags }, cache] = await Promise.all([this.parse(DeployMetadataResume), DeployCache.create()]);
    const jobId = cache.resolveLatest(flags['use-most-recent'], flags['job-id']);

    const deployOpts = cache.get(jobId);

    if (isNotResumable(deployOpts.status)) {
      throw messages.createError('error.DeployNotResumable', [jobId, deployOpts.status]);
    }

    const wait = flags.wait ?? Duration.minutes(deployOpts.wait);
    const { deploy, componentSet } = await executeDeploy(
      // there will always be conflicts on a resume if anything deployed--the changes on the server are not synced to local
      { ...deployOpts, wait, 'dry-run': false, 'ignore-conflicts': true },
      this.project,
      jobId
    );

    this.log(getVersionMessage('Resuming Deployment', componentSet, deployOpts.api));
    this.log(`Deploy ID: ${bold(jobId)}`);
    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, wait.seconds);
    process.exitCode = determineExitCode(result);

    const formatter = new DeployResultFormatter(result, {
      ...flags,
      verbose: deployOpts.verbose,
      concise: deployOpts.concise,
    });

    if (!this.jsonEnabled()) formatter.display();

    cache.update(deploy.id, { status: result.response.status });
    await cache.write();

    return formatter.getJson();
  }
}
