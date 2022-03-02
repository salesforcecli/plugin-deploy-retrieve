/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EOL } from 'os';
import { EnvironmentVariable, Messages, OrgConfigProperties, SfdxPropertyKeys } from '@salesforce/core';
import { get, getString } from '@salesforce/ts-types';
import { DeployResult, FileResponse, RequestStatus, ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { getPackageDirs, getSourceApiVersion } from '../../utils/orgs';
import { asRelativePaths, displayFailures, displaySuccesses, displayTestResults } from '../../utils/output';
import { TestLevel } from '../../utils/testLevel';
import { DeployProgress } from '../../utils/progressBar';
import { resolveRestDeploy } from '../../utils/config';
import { validateOneOfCommandFlags } from '../../utils/requiredFlagValidator';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

// One of these flags must be specified for a valid deploy.
const requiredFlags = ['manifest', 'metadata', 'source-dir'];

export type TestResults = {
  passing: number;
  failing: number;
  total: number;
  time?: number;
};

export type DeployMetadataResult = {
  files: FileResponse[];
  tests?: TestResults;
};

export default class DeployMetadata extends SfCommand<DeployMetadataResult> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static flags = {
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exclusive: ['manifest', 'source-dir'],
    }),
    manifest: Flags.string({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exclusive: ['metadata', 'source-dir'],
    }),
    'source-dir': Flags.string({
      char: 'd',
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      multiple: true,
      exclusive: ['manifest', 'metadata'],
    }),
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: messages.getMessage('flags.target-org.description'),
      summary: messages.getMessage('flags.target-org.summary'),
    }),
    'test-level': Flags.string({
      char: 'l',
      description: messages.getMessage('flags.test-level.description'),
      summary: messages.getMessage('flags.test-level.summary'),
      options: Object.values(TestLevel),
      default: TestLevel.NoTestRun,
    }),
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
      unit: 'minutes',
      defaultValue: 33,
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
    const flags = (await this.parse(DeployMetadata)).flags;
    const testLevel = flags['test-level'] as TestLevel;
    validateOneOfCommandFlags(requiredFlags, flags);

    const componentSet = await ComponentSetBuilder.build({
      sourceapiversion: await getSourceApiVersion(),
      sourcepath: flags['source-dir'],
      manifest: flags.manifest && {
        manifestPath: flags.manifest,
        directoryPaths: await getPackageDirs(),
      },
      metadata: flags.metadata && {
        metadataEntries: flags.metadata,
        directoryPaths: await getPackageDirs(),
      },
    });

    const targetOrg = flags['target-org'].getUsername();

    this.log(`${EOL}${messages.getMessage('deploy.metadata.api', [targetOrg, resolveRestDeploy()])}${EOL}`);

    const deploy = await componentSet.deploy({
      usernameOrConnection: targetOrg,
      apiOptions: { testLevel },
    });

    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, flags.wait.seconds);
    this.setExitCode(result);

    if (!this.jsonEnabled()) {
      displaySuccesses(result);
      displayFailures(result);
      displayTestResults(result, testLevel);
    }

    const files = asRelativePaths(result?.getFileResponses() || []);

    return {
      files,
      tests: this.getTestResults(result),
    };
  }

  private setExitCode(result: DeployResult): void {
    const status = getString(result, 'response.status');
    if (status !== RequestStatus.Succeeded) {
      process.exitCode = 1;
    }
  }

  private getTestResults(result: DeployResult): TestResults {
    const passing = get(result, 'response.numberTestsCompleted', 0) as number;
    const failing = get(result, 'response.numberTestErrors', 0) as number;
    const total = get(result, 'response.numberTestsTotal', 0) as number;
    const testResults = { passing, failing, total };
    const time = get(result, 'response.details.runTestResult.totalTime', 0) as number;
    return time ? { ...testResults, time } : testResults;
  }
}
