/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import * as fs from 'fs';
import { ux } from '@oclif/core';
import { DeployResult, FileResponse, FileResponseFailure, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { Org, SfError } from '@salesforce/core';
import { ensureArray } from '@salesforce/kit';
import {
  CodeCoverageResult,
  CoverageReporter,
  CoverageReporterOptions,
  JUnitReporter,
  TestResult,
} from '@salesforce/apex-node';
import { DeployResultJson, isSdrFailure, isSdrSuccess, TestLevel, Verbosity, Formatter } from '../utils/types';
import {
  generateCoveredLines,
  getCoverageFormattersOptions,
  mapTestResults,
  transformCoverageToApexCoverage,
} from '../utils/coverage';
import { sortFileResponses, asRelativePaths, tableHeader, getFileResponseSuccessProps, error } from '../utils/output';
import { TestResultsFormatter } from '../formatters/testResultsFormatter';

export class DeployResultFormatter extends TestResultsFormatter implements Formatter<DeployResultJson> {
  private relativeFiles: FileResponse[];
  private absoluteFiles: FileResponse[];
  private coverageOptions: CoverageReporterOptions;
  private resultsDir: string;
  private readonly junit: boolean | undefined;

  public constructor(
    protected result: DeployResult,
    protected flags: Partial<{
      'test-level': TestLevel;
      verbose: boolean;
      concise: boolean;
      'coverage-formatters': string[];
      junit: boolean;
      'results-dir': string;
      'target-org': Org;
    }>
  ) {
    super(result, flags);
    this.absoluteFiles = sortFileResponses(this.result.getFileResponses() ?? []);
    this.relativeFiles = asRelativePaths(this.absoluteFiles);
    this.testLevel = this.flags['test-level'];
    this.verbosity = this.determineVerbosity();
    this.resultsDir = this.flags['results-dir'] ?? 'coverage';
    this.coverageOptions = getCoverageFormattersOptions(this.flags['coverage-formatters']);
    this.junit = this.flags.junit;
  }

  public getJson(): DeployResultJson {
    // only generate reports if test results are presented
    if (this.result.response?.numberTestsTotal) {
      if (this.coverageOptions.reportFormats?.length) {
        this.createCoverageReport('no-map');
      }
      if (this.junit) {
        this.createJunitResults();
      }
    }
    if (this.verbosity === 'concise') {
      return {
        ...this.result.response,
        details: {
          componentFailures: this.result.response.details.componentFailures,
          runTestResult: this.result.response.details.runTestResult,
        },
        files: this.absoluteFiles.filter((f) => f.state === 'Failed'),
      };
    } else {
      return {
        ...this.result.response,
        files: this.absoluteFiles,
        ...(this.result.replacements?.size
          ? {
              replacements: Object.fromEntries(this.result.replacements),
            }
          : {}),
      };
    }
  }

  public display(): void {
    if (this.verbosity !== 'concise') {
      this.displaySuccesses();
    }
    this.displayFailures();
    this.displayDeletes();
    this.displayTestResults();
    this.maybeCreateRequestedReports();
    this.displayReplacements();
  }

  public determineVerbosity(): Verbosity {
    if (this.flags.verbose) return 'verbose';
    if (this.flags.concise) return 'concise';
    return 'normal';
  }

  private maybeCreateRequestedReports(): void {
    // only generate reports if test results are presented
    if (this.result.response?.numberTestsTotal) {
      if (this.coverageOptions.reportFormats?.length) {
        ux.log(
          `Code Coverage formats, [${this.flags['coverage-formatters']?.join(', ')}], written to ${this.resultsDir}/`
        );
        this.createCoverageReport('no-map');
      }
      if (this.junit) {
        ux.log(`Junit results written to ${this.resultsDir}/junit/junit.xml`);
        this.createJunitResults();
      }
    }
  }

  private createJunitResults(): void {
    const testResult = this.transformDeployTestsResultsToTestResult();
    if (testResult.summary.testsRan > 0) {
      const jUnitReporter = new JUnitReporter();
      const junitResults = jUnitReporter.format(testResult);

      const junitReportPath = path.join(this.resultsDir ?? '', 'junit');
      fs.mkdirSync(junitReportPath, { recursive: true });
      fs.writeFileSync(path.join(junitReportPath, 'junit.xml'), junitResults, 'utf8');
    }
  }

  private transformDeployTestsResultsToTestResult(): TestResult {
    if (!this.result.response?.details?.runTestResult) {
      throw new SfError('No test results found');
    }
    const runTestResult = this.result.response?.details?.runTestResult;
    const numTestsRun = parseInt(runTestResult.numTestsRun, 10);
    const numTestFailures = parseInt(runTestResult.numFailures, 10);
    return {
      summary: {
        commandTimeInMs: 0,
        failRate: ((numTestFailures / numTestsRun) * 100).toFixed(2) + '%',
        failing: numTestFailures,
        hostname: this.flags['target-org']?.getConnection().getConnectionOptions().instanceUrl as string,
        orgId: this.flags['target-org']?.getConnection().getAuthInfoFields().orgId as string,
        outcome: '',
        passRate: numTestFailures === 0 ? '100%' : ((1 - numTestFailures / numTestsRun) * 100).toFixed(2) + '%',
        passing: numTestsRun - numTestFailures,
        skipRate: '',
        skipped: 0,
        testExecutionTimeInMs: parseFloat(runTestResult.totalTime),
        testRunId: '',
        testStartTime: new Date().toISOString(),
        testTotalTimeInMs: parseFloat(runTestResult.totalTime),
        testsRan: numTestsRun,
        userId: this.flags['target-org']?.getConnection().getConnectionOptions().userId as string,
        username: this.flags['target-org']?.getConnection().getUsername() as string,
      },
      tests: [
        ...mapTestResults(ensureArray(runTestResult.successes)),
        ...mapTestResults(ensureArray(runTestResult.failures)),
      ],
      codecoverage: ensureArray(runTestResult?.codeCoverage).map((cov): CodeCoverageResult => {
        const numLinesUncovered = parseInt(cov.numLocationsNotCovered, 10);
        const [uncoveredLines, coveredLines] = generateCoveredLines(cov);
        const numLocationsNum = parseInt(cov.numLocations, 10);
        const numLocationsNotCovered: number = parseInt(cov.numLocationsNotCovered, 10);
        return {
          // TODO: fix this type in SDR?
          type: cov.type as 'ApexClass' | 'ApexTrigger',
          apexId: cov.id,
          name: cov.name,
          numLinesUncovered,
          numLinesCovered: parseInt(cov.numLocations, 10) - numLinesUncovered,
          coveredLines,
          uncoveredLines,
          percentage:
            numLocationsNum > 0
              ? (((numLocationsNum - numLocationsNotCovered) / numLocationsNum) * 100).toFixed() + '%'
              : '',
        };
      }),
    };
  }

  private createCoverageReport(sourceDir: string): void {
    if (this.resultsDir) {
      const apexCoverage = transformCoverageToApexCoverage(
        ensureArray(this.result.response?.details?.runTestResult?.codeCoverage)
      );
      fs.mkdirSync(this.resultsDir, { recursive: true });
      const coverageReport = new CoverageReporter(apexCoverage, this.resultsDir, sourceDir, this.coverageOptions);
      coverageReport.generateReports();
    }
  }

  private displayReplacements(): void {
    if (this.verbosity === 'verbose' && this.result.replacements?.size) {
      const replacements = Array.from(this.result.replacements.entries()).flatMap(([filepath, stringsReplaced]) =>
        stringsReplaced.map((replaced) => ({
          filePath: path.relative(process.cwd(), filepath),
          replaced,
        }))
      );
      ux.table(
        replacements,
        {
          filePath: { header: 'PROJECT PATH' },
          replaced: { header: 'TEXT REPLACED' },
        },
        {
          title: tableHeader('Metadata Replacements'),
          'no-truncate': true,
        }
      );
    }
  }

  private displaySuccesses(): void {
    const successes = this.relativeFiles.filter((f) => f.state !== 'Failed');

    if (!successes.length || this.result.response.status === RequestStatus.Failed) return;

    const columns = {
      state: { header: 'State' },
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };
    const title = this.result.response.checkOnly ? 'Validated Source' : 'Deployed Source';
    const options = { title: tableHeader(title), 'no-truncate': true };
    ux.log();

    ux.table(
      successes.map((s) => ({ filePath: s.filePath, fullName: s.fullName, type: s.type, state: s.state })),
      columns,
      options
    );
  }

  private displayFailures(): void {
    if (this.result.response.status === RequestStatus.Succeeded) return;

    const failures = this.relativeFiles.filter(isSdrFailure);
    // .push returns a number, so push here
    failures.push(
      ...ensureArray(this.result.response.details.componentFailures).map(
        (fail) =>
          ({
            problemType: fail.problemType,
            fullName: fail.fullName,
            error: fail.problem,
          } as FileResponseFailure)
      )
    );
    if (!failures.length) return;

    const columns = {
      problemType: { header: 'Type' },
      fullName: { header: 'Name' },
      error: { header: 'Problem' },
    };
    const options = { title: error(`Component Failures [${failures.length}]`), 'no-truncate': true };
    ux.log();
    ux.table(
      failures.map((f) => ({ problemType: f.problemType, fullName: f.fullName, error: f.error })),
      columns,
      options
    );
  }

  private displayDeletes(): void {
    const deletions = this.relativeFiles.filter(isSdrSuccess).filter((f) => f.state === 'Deleted');

    if (!deletions.length) return;

    const columns = {
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };

    const options = { title: tableHeader('Deleted Source'), 'no-truncate': true };
    ux.log();

    ux.table(getFileResponseSuccessProps(deletions), columns, options);
  }
}
