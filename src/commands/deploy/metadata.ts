/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { bold } from 'chalk';
import { EnvironmentVariable, Messages, OrgConfigProperties } from '@salesforce/core';
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { AsyncDeployResultFormatter, DeployResultFormatter, getVersionMessage } from '../../utils/output';
import { DeployProgress } from '../../utils/progressBar';
import { DeployResultJson, TestLevel } from '../../utils/types';
import { executeDeploy, resolveApi, validateTests, determineExitCode, DeployCache } from '../../utils/deploy';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../utils/errorCodes';
import { ConfigVars } from '../../configMeta';
import { fileOrDirFlag, testLevelFlag } from '../../utils/flags';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

const EXACTLY_ONE_FLAGS = ['manifest', 'source-dir', 'metadata', 'metadata-dir'];

export default class DeployMetadata extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';

  public static flags = {
    'api-version': Flags.orgApiVersion({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
    async: Flags.boolean({
      summary: messages.getMessage('flags.async.summary'),
      description: messages.getMessage('flags.async.description'),
      exclusive: ['wait'],
    }),
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
      exclusive: ['verbose'],
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      default: false,
    }),
    'ignore-errors': Flags.boolean({
      char: 'r',
      summary: messages.getMessage('flags.ignore-errors.summary'),
      description: messages.getMessage('flags.ignore-errors.description'),
      default: false,
    }),
    'ignore-warnings': Flags.boolean({
      char: 'g',
      summary: messages.getMessage('flags.ignore-warnings.summary'),
      description: messages.getMessage('flags.ignore-warnings.description'),
      default: false,
    }),
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exactlyOne: EXACTLY_ONE_FLAGS,
      exists: true,
    }),
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exactlyOne: EXACTLY_ONE_FLAGS,
    }),
    'metadata-dir': fileOrDirFlag({
      summary: messages.getMessage('flags.metadata-dir.summary'),
      exactlyOne: EXACTLY_ONE_FLAGS,
      exists: true,
    }),
    'single-package': Flags.boolean({
      summary: messages.getMessage('flags.single-package.summary'),
      dependsOn: ['metadata-dir'],
    }),
    'source-dir': Flags.string({
      char: 'd',
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      multiple: true,
      exactlyOne: EXACTLY_ONE_FLAGS,
    }),
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: messages.getMessage('flags.target-org.description'),
      summary: messages.getMessage('flags.target-org.summary'),
    }),
    tests: Flags.string({
      char: 't',
      multiple: true,
      summary: messages.getMessage('flags.tests.summary'),
      description: messages.getMessage('flags.tests.description'),
    }),
    'test-level': testLevelFlag({
      default: TestLevel.NoTestRun,
      description: messages.getMessage('flags.test-level.description'),
      summary: messages.getMessage('flags.test-level.summary'),
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

  public static configurationVariablesSection = toHelpSection(
    'CONFIGURATION VARIABLES',
    OrgConfigProperties.TARGET_ORG,
    OrgConfigProperties.ORG_API_VERSION,
    ConfigVars.ORG_METADATA_REST_DEPLOY
  );

  public static envVariablesSection = toHelpSection(
    'ENVIRONMENT VARIABLES',
    EnvironmentVariable.SF_TARGET_ORG,
    EnvironmentVariable.SF_USE_PROGRESS_BAR
  );

  public static errorCodes = toHelpSection('ERROR CODES', DEPLOY_STATUS_CODES_DESCRIPTIONS);

  public async run(): Promise<DeployResultJson> {
    const { flags } = await this.parse(DeployMetadata);
    if (!validateTests(flags['test-level'], flags.tests)) {
      throw messages.createError('error.NoTestsSpecified');
    }

    const api = await resolveApi();
    const { deploy, componentSet } = await executeDeploy({
      ...flags,
      'target-org': flags['target-org'].getUsername(),
      api,
    });

    const action = flags['dry-run'] ? 'Deploying (dry-run)' : 'Deploying';
    this.log(getVersionMessage(action, componentSet, api));
    this.log(`Deploy ID: ${bold(deploy.id)}`);

    if (flags.async) {
      const asyncFormatter = new AsyncDeployResultFormatter(deploy.id);
      if (!this.jsonEnabled()) asyncFormatter.display();
      return asyncFormatter.getJson();
    }

    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus({ timeout: flags.wait });
    this.setExitCode(result);

    const formatter = new DeployResultFormatter(result, flags);

    if (!this.jsonEnabled()) {
      formatter.display();
      if (flags['dry-run']) this.logSuccess('Dry-run complete.');
    }

    await DeployCache.update(deploy.id, { status: result.response.status });

    return formatter.getJson();
  }

  protected catch(error: SfCommand.Error): Promise<SfCommand.Error> {
    if (error.message.includes('client has timed out')) {
      const err = messages.createError('error.ClientTimeout');
      return super.catch({ ...error, name: err.name, message: err.message, code: err.code });
    }
    return super.catch(error);
  }

  private setExitCode(result: DeployResult): void {
    process.exitCode = determineExitCode(result);
  }
}
