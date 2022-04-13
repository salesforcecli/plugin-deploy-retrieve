/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { EnvironmentVariable, Messages, OrgConfigProperties, SfdxPropertyKeys } from '@salesforce/core';
import { DeployResult, FileResponse, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { displayDeployResults, getVersionMessage } from '../../utils/output';
import { DeployProgress } from '../../utils/progressBar';
import { TestLevel, TestResults } from '../../utils/types';
import { executeDeploy, testLevelFlag, getTestResults, resolveRestDeploy, validateTests } from '../../utils/deploy';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

export type DeployMetadataResult = {
  files: FileResponse[];
  jobId: string;
  tests?: TestResults;
};

export default class DeployMetadata extends SfCommand<DeployMetadataResult> {
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
      exactlyOne: ['manifest', 'source-dir', 'metadata'],
      exists: true,
    }),
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exactlyOne: ['manifest', 'source-dir', 'metadata'],
    }),
    'source-dir': Flags.string({
      char: 'd',
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      multiple: true,
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
      description: messages.getMessage('flags.tests.description'),
    }),
    'test-level': testLevelFlag({
      default: TestLevel.NoTestRun,
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

  public async run(): Promise<DeployMetadataResult> {
    const { flags } = await this.parse(DeployMetadata);
    if (!validateTests(flags['test-level'], flags.tests)) {
      throw messages.createError('error.NoTestsSpecified');
    }
    const api = resolveRestDeploy();
    const { deploy, componentSet } = await executeDeploy({
      ...flags,
      'target-org': flags['target-org'].getUsername(),
      api,
    });

    const action = flags['dry-run'] ? 'Deploying (dry-run)' : 'Deploying';
    this.log(getVersionMessage(action, componentSet, api));
    this.log(`Deploy ID: ${deploy.id}`);
    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, flags.wait.seconds);
    this.setExitCode(result);

    if (!this.jsonEnabled()) {
      displayDeployResults(result, flags['test-level'], flags.verbose);
      if (flags['dry-run']) this.log('Dry-run complete.');
    }

    return {
      jobId: result.response.id,
      files: result.getFileResponses() || [],
      tests: getTestResults(result),
    };
  }

  private setExitCode(result: DeployResult): void {
    if (result.response.status !== RequestStatus.Succeeded) {
      process.exitCode = 1;
    }
  }
}
