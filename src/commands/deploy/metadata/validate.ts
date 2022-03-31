/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { bold } from 'chalk';
import { EnvironmentVariable, Messages, OrgConfigProperties, SfdxPropertyKeys } from '@salesforce/core';
import { DeployResult, FileResponse, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { displayDeployResults, getVersionMessage } from '../../../utils/output';
import { DeployProgress } from '../../../utils/progressBar';
import { TestLevel, TestResults } from '../../../utils/types';
import {
  executeDeploy,
  testLevelFlag,
  getTestResults,
  resolveRestDeploy,
  determineExitCode,
} from '../../../utils/deploy';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.validate');

export type DeployMetadataValidateResult = {
  files: FileResponse[];
  jobId: string;
  tests?: TestResults;
};

export default class DeployMetadataValidate extends SfCommand<DeployMetadataValidateResult> {
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
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exclusive: ['metadata', 'source-dir'],
      exactlyOne: ['manifest', 'source-dir', 'metadata'],
    }),
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exclusive: ['manifest', 'source-dir'],
      exactlyOne: ['manifest', 'source-dir', 'metadata'],
    }),
    'source-dir': Flags.string({
      char: 'd',
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      multiple: true,
      exclusive: ['manifest', 'metadata'],
      exactlyOne: ['manifest', 'source-dir', 'metadata'],
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
    }),
    'test-level': testLevelFlag({
      options: [TestLevel.RunAllTestsInOrg, TestLevel.RunLocalTests, TestLevel.RunSpecifiedTests],
      default: TestLevel.RunLocalTests,
      description: messages.getMessage('flags.test-level.description'),
      summary: messages.getMessage('flags.test-level.summary'),
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
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
    SfdxPropertyKeys.API_VERSION
  );

  public static envVariablesSection = toHelpSection(
    'ENVIRONMENT VARIABLES',
    EnvironmentVariable.SF_TARGET_ORG,
    EnvironmentVariable.SF_USE_PROGRESS_BAR
  );

  public static errorCodes = toHelpSection('ERROR CODES', DEPLOY_STATUS_CODES_DESCRIPTIONS);

  public async run(): Promise<DeployMetadataValidateResult> {
    const flags = (await this.parse(DeployMetadataValidate)).flags;
    const api = resolveRestDeploy();
    const { deploy, componentSet } = await executeDeploy({
      ...flags,
      'dry-run': true,
      'target-org': flags['target-org'].getUsername(),
      api,
    });

    this.log(getVersionMessage('Validating Deployment', componentSet, api));
    this.log(`Deploy ID: ${deploy.id}`);
    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, flags.wait.seconds);
    this.setExitCode(result);

    if (!this.jsonEnabled()) {
      displayDeployResults(result, flags['test-level'], flags.verbose);
    }

    if (result.response.status === RequestStatus.Succeeded) {
      this.log();
      this.log(messages.getMessage('info.SuccessfulValidation', [deploy.id]));

      const suggestedCommand = `${this.config.bin} deploy metadata quick --job-id ${deploy.id}`;
      this.log(`\nRun ${bold(suggestedCommand)} to execute this deploy.`);
    } else {
      throw messages.createError('error.FailedValidation', [deploy.id]);
    }

    return {
      jobId: result.response.id,
      files: result.getFileResponses() || [],
      tests: getTestResults(result.response),
    };
  }

  private setExitCode(result: DeployResult): void {
    process.exitCode = determineExitCode(result);
  }
}
