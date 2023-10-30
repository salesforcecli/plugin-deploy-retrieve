/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { bold } from 'chalk';
import { Messages, Org } from '@salesforce/core';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { MetadataApiDeploy, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { DeployOptions, determineExitCode, resolveApi } from '../../../utils/deploy';
import { DeployCache } from '../../../utils/deployCache';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes';
import { AsyncDeployResultFormatter } from '../../../formatters/asyncDeployResultFormatter';
import { DeployResultFormatter } from '../../../formatters/deployResultFormatter';
import { DeployResultJson } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
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
    const jobId = cache.resolveLatest(flags['use-most-recent'], flags['job-id'], false);

    const deployOpts = cache.get(jobId) ?? ({} as DeployOptions);
    const org = flags['target-org'] ?? (await Org.create({ aliasOrUsername: deployOpts['target-org'] }));
    const api = await resolveApi(this.configAggregator);

    const mdapiDeploy = new MetadataApiDeploy({
      usernameOrConnection: org.getConnection(flags['api-version']),
      id: jobId,
      apiOptions: {
        rest: api === 'REST',
      },
    });
    // This is the ID of the deploy (of the validated metadata)
    const deployId = await mdapiDeploy.deployRecentValidation(api === 'REST');
    this.log(`Deploy ID: ${bold(deployId)}`);

    if (flags.async) {
      const asyncFormatter = new AsyncDeployResultFormatter(deployId, this.config.bin);
      if (!this.jsonEnabled()) asyncFormatter.display();
      return asyncFormatter.getJson();
    }

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

  protected catch(error: SfCommand.Error): Promise<SfCommand.Error> {
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
