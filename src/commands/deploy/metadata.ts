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
import { getPackageDirs, getSourceApiVersion, resolveTargetOrg } from '../../utils/orgs';
import { asRelativePaths, displayFailures, displaySuccesses, displayTestResults } from '../../utils/output';
import { DeployProgress } from '../../utils/progressBar';
import { apiFlag, testLevelFlag } from '../../utils/flags';
import { API } from '../../utils/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

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
    api: apiFlag({
      summary: messages.getMessage('flags.api.summary'),
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
    }),
    'ignore-errors': Flags.boolean({
      char: 'r',
      summary: messages.getMessage('flags.ignore-errors.summary'),
    }),
    'ignore-warnings': Flags.boolean({
      char: 'g',
      summary: messages.getMessage('flags.ignore-warnings.summary'),
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
    // TODO: make this Flags.requiredOrg once https://github.com/oclif/core/pull/386 is merged
    'target-org': Flags.string({
      char: 'o',
      description: messages.getMessage('flags.target-org.description'),
      summary: messages.getMessage('flags.target-org.summary'),
    }),
    tests: Flags.string({
      char: 't',
      multiple: true,
      summary: messages.getMessage('flags.tests.summary'),
      default: [],
    }),
    'test-level': testLevelFlag({
      char: 'l',
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

    const targetOrg = await resolveTargetOrg(flags['target-org']);

    this.log(`${EOL}${messages.getMessage('deploy.metadata.api', [targetOrg, flags.api])}${EOL}`);

    const deploy = await componentSet.deploy({
      usernameOrConnection: targetOrg,
      apiOptions: {
        checkOnly: flags['dry-run'],
        ignoreWarnings: flags['ignore-warnings'],
        rest: flags.api === API.REST,
        rollbackOnError: !flags['ignore-errors'],
        runTests: flags.tests,
        testLevel: flags['test-level'],
      },
    });

    new DeployProgress(deploy, this.jsonEnabled()).start();

    const result = await deploy.pollStatus(500, flags.wait.seconds);
    this.setExitCode(result);

    if (!this.jsonEnabled()) {
      displaySuccesses(result);
      displayFailures(result);
      displayTestResults(result, flags['test-level']);
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
