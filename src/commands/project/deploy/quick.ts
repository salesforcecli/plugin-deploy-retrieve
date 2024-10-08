/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import ansis from 'ansis';
import { Messages, Org } from '@salesforce/core';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { MetadataApiDeploy, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { determineExitCode, resolveApi, buildDeployUrl } from '../../../utils/deploy.js';
import { DeployCache } from '../../../utils/deployCache.js';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes.js';
import { AsyncDeployResultFormatter } from '../../../formatters/asyncDeployResultFormatter.js';
import { DeployResultFormatter } from '../../../formatters/deployResultFormatter.js';
import { API, DeployResultJson } from '../../../utils/types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.quick');

export default class DeployMetadataQuick extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly aliases = ['deploy:metadata:quick'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
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
      length: 'both',
      description: messages.getMessage('flags.job-id.description'),
      summary: messages.getMessage('flags.job-id.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
    'target-org': Flags.optionalOrg(),
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
      default: Duration.minutes(33),
      helpValue: '<minutes>',
      min: 1,
      exclusive: ['async'],
    }),
    'api-version': Flags.orgApiVersion({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
  };

  public static errorCodes = toHelpSection('ERROR CODES', DEPLOY_STATUS_CODES_DESCRIPTIONS);

  public async run(): Promise<DeployResultJson> {
    const [{ flags }, cache] = await Promise.all([this.parse(DeployMetadataQuick), DeployCache.create()]);

    // This is the ID of the validation request
    const jobId = resolveJobId(cache, flags['use-most-recent'], flags['job-id']);
    const targetOrg = await resolveTargetOrg(cache, jobId, flags['target-org']);
    const api = await resolveApi(this.configAggregator);
    const connection = targetOrg.getConnection(flags['api-version']);

    // This is the ID of the deploy (of the validated metadata)
    const deployId = await connection.metadata.deployRecentValidation({
      id: jobId,
      rest: api === API['REST'],
    });
    this.log(`Deploy ID: ${ansis.bold(deployId)}`);
    const deployUrl = buildDeployUrl(deployId);
    this.log(`Deploy URL: ${ansis.bold(deployUrl)}`);

    if (flags.async) {
      const asyncFormatter = new AsyncDeployResultFormatter(deployId);
      if (!this.jsonEnabled()) asyncFormatter.display();
      return asyncFormatter.getJson();
    }

    const mdapiDeploy = new MetadataApiDeploy({
      usernameOrConnection: connection,
      id: deployId,
      apiOptions: {
        rest: api === API['REST'],
      },
    });
    const result = await mdapiDeploy.pollStatus({
      frequency: Duration.seconds(1),
      timeout: flags.wait,
    });
    const formatter = new DeployResultFormatter(result, flags);

    if (!this.jsonEnabled()) formatter.display();

    await DeployCache.update(deployId, { status: result.response.status });

    process.exitCode = determineExitCode(result);
    if (result.response.status === RequestStatus.Succeeded) {
      this.log();
      this.logSuccess(messages.getMessage('info.QuickDeploySuccess', [deployId]));
    } else {
      this.log(messages.getMessage('error.QuickDeployFailure', [deployId, result.response.status]));
    }

    return formatter.getJson();
  }

  protected catch(error: SfCommand.Error): Promise<never> {
    if (error.name.includes('INVALID_ID_FIELD')) {
      const err = messages.createError('error.CannotQuickDeploy');
      return super.catch({
        ...error,
        name: err.name,
        message: err.message,
        ...(typeof err.code === 'string' || typeof err.code === 'number' ? { code: err.code } : {}),
      });
    }
    return super.catch(error);
  }
}

/** Resolve a job ID for a validated deploy using cache, most recent, or a job ID flag. */
const resolveJobId = (cache: DeployCache, useMostRecentFlag: boolean, jobIdFlag?: string): string => {
  try {
    return cache.resolveLatest(useMostRecentFlag, jobIdFlag, true);
  } catch (e) {
    if (e instanceof Error && e.name === 'NoMatchingJobIdError' && jobIdFlag) {
      return jobIdFlag; // Use the specified 15 char job ID
    }
    throw e;
  }
};

/** Resolve a target org using job ID in cache, or a target org flag. */
const resolveTargetOrg = async (cache: DeployCache, jobId: string, targetOrgFlag: Org): Promise<Org> => {
  const orgFromCache = cache.maybeGet(jobId)?.['target-org'];
  const targetOrg = orgFromCache ? await Org.create({ aliasOrUsername: orgFromCache }) : targetOrgFlag;

  // If we don't have a target org at this point, throw.
  if (!targetOrg) {
    throw messages.createError('error.NoTargetOrg');
  }

  return targetOrg;
};
