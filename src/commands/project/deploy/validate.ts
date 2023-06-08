/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { bold } from 'chalk';
import { EnvironmentVariable, Lifecycle, Messages, OrgConfigProperties, SfError } from '@salesforce/core';
import { CodeCoverageWarnings, DeployVersionData, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { ensureArray } from '@salesforce/kit';
import { AsyncDeployResultFormatter } from '../../../formatters/asyncDeployResultFormatter';
import { DeployResultFormatter } from '../../../formatters/deployResultFormatter';
import { DeployProgress } from '../../../utils/progressBar';
import { DeployResultJson, TestLevel } from '../../../utils/types';
import { executeDeploy, resolveApi, determineExitCode } from '../../../utils/deploy';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes';
import { ConfigVars } from '../../../configMeta';
import { fileOrDirFlag, testLevelFlag, testsFlag } from '../../../utils/flags';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.validate');
const deployMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

const EXACTLY_ONE_FLAGS = ['manifest', 'source-dir', 'metadata', 'metadata-dir'];

export default class DeployMetadataValidate extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly aliases = ['deploy:metadata:validate'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'api-version': Flags.orgApiVersion({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
    async: Flags.boolean({
      summary: messages.getMessage('flags.async.summary'),
      description: messages.getMessage('flags.async.description'),
    }),
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
      exclusive: ['verbose'],
    }),
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exactlyOne: EXACTLY_ONE_FLAGS,
    }),
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exactlyOne: EXACTLY_ONE_FLAGS,
    }),
    'source-dir': Flags.string({
      char: 'd',
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
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
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: messages.getMessage('flags.target-org.description'),
      summary: messages.getMessage('flags.target-org.summary'),
      required: true,
    }),
    tests: testsFlag,
    'test-level': testLevelFlag({
      options: [TestLevel.RunAllTestsInOrg, TestLevel.RunLocalTests, TestLevel.RunSpecifiedTests],
      default: TestLevel.RunLocalTests,
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
    const [{ flags }, api] = await Promise.all([this.parse(DeployMetadataValidate), resolveApi(this.configAggregator)]);
    const username = flags['target-org'].getUsername();

    // eslint-disable-next-line @typescript-eslint/require-await
    Lifecycle.getInstance().on('apiVersionDeploy', async (apiData: DeployVersionData) => {
      this.log(
        deployMessages.getMessage('apiVersionMsgDetailed', [
          'Validating Deployment of',
          apiData.manifestVersion,
          username,
          apiData.apiVersion,
          apiData.webService,
        ])
      );
    });

    const { deploy } = await executeDeploy(
      {
        ...flags,
        'ignore-conflicts': true,
        'dry-run': true,
        'target-org': username,
        api,
      },
      this.config.bin,
      this.project,
      undefined,
      true
    );

    if (!deploy.id) {
      throw new SfError('The deploy id is not available.');
    }
    this.log(`Deploy ID: ${bold(deploy.id)}`);

    if (flags.async) {
      const asyncFormatter = new AsyncDeployResultFormatter(deploy.id, this.config.bin);
      if (!this.jsonEnabled()) asyncFormatter.display();
      return asyncFormatter.getJson();
    }

    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, flags.wait?.seconds);
    process.exitCode = determineExitCode(result);
    const formatter = new DeployResultFormatter(result, flags);

    if (!this.jsonEnabled()) {
      formatter.display();
    }

    if (result.response.status === RequestStatus.Succeeded) {
      this.log();
      this.logSuccess(messages.getMessage('info.SuccessfulValidation', [deploy.id]));
      this.log(messages.getMessage('info.suggestedQuickDeploy', [this.config.bin, deploy.id]));
    } else {
      throw messages.createError('error.FailedValidation', [
        deploy.id,
        [
          // I think the type might be wrong in SDR
          ...ensureArray(result.response.details.runTestResult?.codeCoverageWarnings).map(
            (warning: CodeCoverageWarnings & { name?: string }) =>
              `${warning.name ? `${warning.name} - ` : ''}${warning.message}`
          ),
          result.response.errorMessage,
          result.response.numberComponentErrors ? `${result.response.numberComponentErrors} component error(s)` : '',
        ]
          .join(os.EOL)
          .trim(),
      ]);
    }

    return formatter.getJson();
  }
}
