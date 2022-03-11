/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EnvironmentVariable, Messages, OrgConfigProperties, SfdxPropertyKeys } from '@salesforce/core';
import { DeployResult, FileResponse, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { displayDeployResults, getVersionMessage } from '../../../utils/output';
import { DeployProgress } from '../../../utils/progressBar';
import { TestLevel, TestResults } from '../../../utils/types';
import { executeDeploy, apiFlag, testLevelFlag, getTestResults } from '../../../utils/deploy';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.quick');

export type DeployMetadataQuickResult = {
  files: FileResponse[];
  jobId: string;
  tests?: TestResults;
};

export default class DeployMetadataQuick extends SfCommand<DeployMetadataQuickResult> {
  public static readonly hidden = true; // hidden until `sf deploy metadata resume` is implemented.
  public static readonly state = 'beta';
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static flags = {
    api: apiFlag({
      summary: messages.getMessage('flags.api.summary'),
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

  public async run(): Promise<DeployMetadataQuickResult> {
    const flags = (await this.parse(DeployMetadataQuick)).flags;
    const { deploy, componentSet } = await executeDeploy({ ...flags, 'dry-run': true });

    this.log(getVersionMessage('Quick Deploying', componentSet, flags.api));
    this.log(`Deploy ID: ${deploy.id}`);
    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, flags.wait.seconds);
    this.setExitCode(result);

    if (!this.jsonEnabled()) {
      displayDeployResults(result, flags['test-level'], flags.verbose);
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
