/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { ux } from '@oclif/core';
import { dim, underline } from 'chalk';
import {
  CodeCoverage,
  CodeCoverageWarnings,
  DeployResult,
  Failures,
  MetadataApiDeployStatus,
  RunTestResult,
  Successes,
} from '@salesforce/source-deploy-retrieve';
import { ensureArray } from '@salesforce/kit';
import { TestLevel, Verbosity } from '../utils/types';
import { tableHeader, error, success, check } from '../utils/output';
import { coverageOutput } from '../utils/coverage';

export class TestResultsFormatter {
  public testLevel: TestLevel | undefined;
  public verbosity: Verbosity;

  public constructor(
    protected result: DeployResult,
    protected flags: Partial<{
      'test-level': TestLevel;
      verbose: boolean;
    }>
  ) {
    this.testLevel = flags['test-level'];
    this.verbosity = this.determineVerbosity();
  }

  public displayTestResults(): void {
    if (this.testLevel === TestLevel.NoTestRun || !this.result.response.runTestsEnabled) {
      ux.log();
      return;
    }

    displayVerboseTestFailures(this.result.response);

    if (this.verbosity === 'verbose') {
      displayVerboseTestSuccesses(this.result.response.details.runTestResult?.successes);
      displayVerboseTestCoverage(this.result.response.details.runTestResult?.codeCoverage);
    }

    ux.log();
    ux.log(tableHeader('Test Results Summary'));
    ux.log(`Passing: ${this.result.response.numberTestsCompleted ?? 0}`);
    ux.log(`Failing: ${this.result.response.numberTestErrors ?? 0}`);
    ux.log(`Total: ${this.result.response.numberTestsTotal ?? 0}`);
    const time = this.result.response.details.runTestResult?.totalTime ?? 0;
    if (time) ux.log(`Time: ${time}`);
    // I think the type might be wrong in SDR
    ensureArray(this.result.response.details.runTestResult?.codeCoverageWarnings).map(
      (warning: CodeCoverageWarnings & { name?: string }) =>
        ux.warn(`${warning.name ? `${warning.name} - ` : ''}${warning.message}`)
    );
  }

  public determineVerbosity(): Verbosity {
    if (this.flags.verbose) return 'verbose';
    return 'normal';
  }
}

const displayVerboseTestSuccesses = (resultSuccesses: RunTestResult['successes']): void => {
  const successes = ensureArray(resultSuccesses).sort(testResultSort);
  if (successes.length > 0) {
    ux.log();
    ux.log(success(`Test Success [${successes.length}]`));
    for (const test of successes) {
      const testName = underline(`${test.name}.${test.methodName}`);
      ux.log(`${check} ${testName}`);
    }
  }
};

/** display the Test failures if there are any testErrors in the mdapi deploy response */
const displayVerboseTestFailures = (response: MetadataApiDeployStatus): void => {
  if (!response.numberTestErrors) return;
  const failures = ensureArray(response.details.runTestResult?.failures).sort(testResultSort);
  const failureCount = response.details.runTestResult?.numFailures;
  ux.log();
  ux.log(error(`Test Failures [${failureCount}]`));
  for (const test of failures) {
    const testName = underline(`${test.name}.${test.methodName}`);
    ux.log(`• ${testName}`);
    ux.log(`  ${dim('message')}: ${test.message}`);
    if (test.stackTrace) {
      const stackTrace = test.stackTrace.replace(/\n/g, `${os.EOL}    `);
      ux.log(`  ${dim('stacktrace')}: ${os.EOL}    ${stackTrace}`);
    }
    ux.log();
  }
};

/**
 * Display the table if there is at least one coverage item in the result
 */
const displayVerboseTestCoverage = (coverage?: CodeCoverage | CodeCoverage[]): void => {
  const codeCoverage = ensureArray(coverage);
  if (codeCoverage.length) {
    ux.log();
    ux.log(tableHeader('Apex Code Coverage'));

    ux.table(codeCoverage.sort(coverageSort).map(coverageOutput), {
      name: { header: 'Name' },
      coveragePercent: { header: '% Covered' },
      linesNotCovered: { header: 'Uncovered Lines' },
    });
  }
};

const testResultSort = <T extends Successes | Failures>(a: T, b: T): number =>
  a.methodName === b.methodName ? a.name.localeCompare(b.name) : a.methodName.localeCompare(b.methodName);

const coverageSort = (a: CodeCoverage, b: CodeCoverage): number =>
  a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
