/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { ux } from '@oclif/core';
import * as chalk from 'chalk';
import { dim, underline } from 'chalk';
import { CodeCoverageWarnings, DeployResult, FileResponse, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { ensureArray } from '@salesforce/kit';
import { bold } from 'chalk';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { DeleteSourceJson, Formatter, TestLevel, Verbosity } from '../utils/types';
import {
  sortFileResponses,
  asRelativePaths,
  tableHeader,
  sortTestResults,
  error,
  success,
  check,
} from '../utils/output';
import { coverageOutput } from '../utils/coverage';

export class DeleteResultFormatter implements Formatter<DeleteSourceJson> {
  private testLevel: TestLevel | undefined;
  private verbosity: Verbosity;

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
  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): DeleteSourceJson {
    return {
      ...this.result.response,
      deletedSource: this.result.getFileResponses() ?? [],
      outboundFiles: [],
      deployedSource: [],
      deletes: [Object.assign({}, this.result?.response)],
    };
  }

  public display(): void {
    this.displayTestResults();
    if ([0, 69].includes(process.exitCode ?? 0)) {
      const successes: FileResponse[] = [];
      const fileResponseSuccesses: Map<string, FileResponse> = new Map<string, FileResponse>();

      if (this.result?.getFileResponses()?.length) {
        const fileResponses: FileResponse[] = [];
        this.result?.getFileResponses().map((f: FileResponse) => {
          fileResponses.push(f);
          fileResponseSuccesses.set(`${f.type}#${f.fullName}`, f);
        });
        sortFileResponses(fileResponses);
        asRelativePaths(fileResponses);
        successes.push(...fileResponses);
      }

      const deployMessages = ensureArray(this.result?.response?.details?.componentSuccesses).filter(
        (item) => !item.fileName.includes('package.xml')
      );
      if (deployMessages.length >= successes.length) {
        // if there's additional successes in the API response, find the success and add it to the output
        deployMessages.map((deployMessage) => {
          if (!fileResponseSuccesses.has(`${deployMessage.componentType}#${deployMessage.fullName}`)) {
            successes.push(
              Object.assign(deployMessage, {
                type: deployMessage.componentType,
              } as FileResponse)
            );
          }
        });
      }

      ux.log('');
      ux.styledHeader(chalk.blue('Deleted Source'));
      ux.table(
        successes.map((entry) => ({
          fullName: entry.fullName,
          type: entry.type,
          filePath: entry.filePath,
        })),
        {
          fullName: { header: 'FULL NAME' },
          type: { header: 'TYPE' },
          filePath: { header: 'PROJECT PATH' },
        },
        { 'no-truncate': true }
      );
    } else {
      this.displayFailures();
    }
  }

  private displayTestResults(): void {
    if (this.testLevel === TestLevel.NoTestRun || !this.result.response.runTestsEnabled) {
      ux.log();
      return;
    }

    this.displayVerboseTestFailures();

    if (this.verbosity === 'verbose') {
      this.displayVerboseTestSuccesses();
      this.displayVerboseTestCoverage();
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

  private displayVerboseTestCoverage(): void {
    const codeCoverage = ensureArray(this.result.response.details.runTestResult?.codeCoverage);
    if (codeCoverage.length) {
      const coverage = codeCoverage.sort((a, b) => (a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1));
      ux.log();
      ux.log(tableHeader('Apex Code Coverage'));

      ux.table(coverage.map(coverageOutput), {
        name: { header: 'Name' },
        numLocations: { header: '% Covered' },
        lineNotCovered: { header: 'Uncovered Lines' },
      });
    }
  }

  private displayVerboseTestSuccesses(): void {
    const successes = ensureArray(this.result.response.details.runTestResult?.successes);
    if (successes.length > 0) {
      const testSuccesses = sortTestResults(successes);
      ux.log();
      ux.log(success(`Test Success [${successes.length}]`));
      for (const test of testSuccesses) {
        const testName = underline(`${test.name}.${test.methodName}`);
        ux.log(`${check} ${testName}`);
      }
    }
  }

  private displayVerboseTestFailures(): void {
    if (!this.result.response.numberTestErrors) return;
    const failures = ensureArray(this.result.response.details.runTestResult?.failures);
    const failureCount = this.result.response.details.runTestResult?.numFailures;
    const testFailures = sortTestResults(failures);
    ux.log();
    ux.log(error(`Test Failures [${failureCount}]`));
    for (const test of testFailures) {
      const testName = underline(`${test.name}.${test.methodName}`);
      ux.log(`• ${testName}`);
      ux.log(`  ${dim('message')}: ${test.message}`);
      if (test.stackTrace) {
        const stackTrace = test.stackTrace.replace(/\n/g, `${os.EOL}    `);
        ux.log(`  ${dim('stacktrace')}: ${os.EOL}    ${stackTrace}`);
      }
      ux.log();
    }
  }

  private determineVerbosity(): Verbosity {
    if (this.flags.verbose) return 'verbose';
    return 'normal';
  }

  private displayFailures(): void {
    if (this.result.response.status === RequestStatus.Succeeded) return;

    const failures = ensureArray(this.result.response.details.componentFailures);
    if (!failures.length) return;

    const columns = {
      problemType: { header: 'Type' },
      fullName: { header: 'Name' },
      error: { header: 'Problem' },
    };
    const options: ux.Table.table.Options = {
      title: StandardColors.error(bold(`Component Failures [${failures.length}]`)),
      'no-truncate': true,
    };
    ux.log();
    ux.table(
      failures.map((f) => ({ problemType: f.problemType, fullName: f.fullName, error: f.problem })),
      columns,
      options
    );
  }
}
