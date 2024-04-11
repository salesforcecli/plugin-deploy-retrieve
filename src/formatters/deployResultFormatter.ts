/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'node:path';
import { EOL } from 'node:os';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { ux } from '@oclif/core';
import {
  ComponentStatus,
  DeployResult,
  FileResponse,
  FileResponseFailure,
  FileResponseSuccess,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';
import { Org, SfError, Lifecycle } from '@salesforce/core';
import { Duration, ensureArray, sortBy } from '@salesforce/kit';
import {
  CodeCoverageResult,
  CoverageReporter,
  CoverageReporterOptions,
  JUnitReporter,
  TestResult,
} from '@salesforce/apex-node';
import {
  DeployResultJson,
  isSdrFailure,
  isSdrSuccess,
  TestLevel,
  Verbosity,
  Formatter,
  isFileResponseDeleted,
} from '../utils/types.js';
import {
  generateCoveredLines,
  getCoverageFormattersOptions,
  getCoverageNumbers,
  mapTestResults,
  transformCoverageToApexCoverage,
} from '../utils/coverage.js';
import {
  tableHeader,
  getFileResponseSuccessProps,
  error,
  fileResponseSortFn,
  makePathRelative,
} from '../utils/output.js';
import { TestResultsFormatter } from '../formatters/testResultsFormatter.js';

export class DeployResultFormatter extends TestResultsFormatter implements Formatter<DeployResultJson> {
  private readonly relativeFiles: FileResponse[];
  private readonly absoluteFiles: FileResponse[];
  private readonly coverageOptions: CoverageReporterOptions;
  private readonly resultsDir: string;
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
      wait: Duration | number;
    }>,
    /** add extra synthetic fileResponses not in the mdapiResponse  */
    protected extraDeletes: FileResponseSuccess[] = []
  ) {
    super(result, flags);
    this.absoluteFiles = (this.result.getFileResponses() ?? []).sort(fileResponseSortFn);
    this.relativeFiles = this.absoluteFiles.map(makePathRelative);
    this.testLevel = this.flags['test-level'];
    this.verbosity = this.determineVerbosity();
    this.resultsDir = this.flags['results-dir'] ?? 'coverage';
    this.coverageOptions = getCoverageFormattersOptions(this.flags['coverage-formatters']);
    this.junit = this.flags.junit;
  }

  public async getJson(): Promise<DeployResultJson> {
    // only generate reports if test results are presented
    if (
      (!this.result.response?.numberTestsTotal && !this.flags['test-level']) ||
      this.flags['test-level'] === TestLevel['NoTestRun']
    ) {
      const testsWarn = (
        this.coverageOptions.reportFormats?.length ? ['`--coverage-formatters` was specified but no tests ran.'] : []
      )
        .concat(this.junit ? ['`--junit` was specified but no tests ran.'] : [])
        .concat([
          'You can ensure tests run by specifying `--test-level` and setting it to `RunSpecifiedTests`, `RunLocalTests` or `RunAllTestsInOrg`.',
        ]);

      // only emit warning if --coverage-formatters or --junit flags were passed
      if (testsWarn.length > 1) {
        await Lifecycle.getInstance().emitWarning(testsWarn.join(EOL));
      }
    }

    if (this.coverageOptions.reportFormats?.length) {
      this.createCoverageReport('no-map');
    }
    if (this.junit) {
      this.createJunitResults();
    }

    if (this.verbosity === 'concise') {
      return {
        ...this.result.response,
        details: {
          componentFailures: this.result.response.details.componentFailures,
          runTestResult: this.result.response.details.runTestResult,
        },
        files: this.absoluteFiles.filter(isSdrFailure),
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
    displayDeletes(this.relativeFiles, this.extraDeletes);
    this.displayTestResults();
    this.maybeCreateRequestedReports();
    this.displayReplacements();
  }

  public determineVerbosity(): Verbosity {
    if (this.flags.verbose) return 'verbose';
    if (this.flags.concise) return 'concise';
    return 'normal';
  }

  public getFileResponseFailures(): FileResponseFailure[] | undefined {
    const failures = this.relativeFiles.filter(isSdrFailure);
    const deployMessages = ensureArray(this.result.response.details?.componentFailures);
    if (deployMessages.length > failures.length) {
      const failureKeySet = new Set(failures.map((f) => makeKey(f.type, f.fullName)));
      // if there's additional failures in the API response, find the failure and add it to the output
      deployMessages
        .filter((m) => !m.componentType || !failureKeySet.has(makeKey(m.componentType, m.fullName)))
        .map((deployMessage) => {
          failures.push({
            fullName: deployMessage.fullName,
            type: deployMessage.componentType ?? 'UNKNOWN',
            state: ComponentStatus.Failed,
            error: deployMessage.problem ?? 'UNKNOWN',
            problemType: deployMessage.problemType ?? 'Error',
          });
        });
    }
    return failures;
  }

  private maybeCreateRequestedReports(): void {
    // only generate reports if test results are presented
    if (this.coverageOptions.reportFormats?.length) {
      ux.log(
        `Code Coverage formats, [${this.flags['coverage-formatters']?.join(', ')}], written to ${join(
          this.resultsDir,
          'coverage'
        )}/`
      );
      this.createCoverageReport('no-map');
    }

    if (this.junit) {
      ux.log(`Junit results written to ${this.resultsDir}/junit/junit.xml`);
      this.createJunitResults();
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
        const [uncoveredLines, coveredLines] = generateCoveredLines(cov);
        const [numLocationsNum, numLinesUncovered] = getCoverageNumbers(cov);

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
              ? (((numLocationsNum - numLinesUncovered) / numLocationsNum) * 100).toFixed() + '%'
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
    const successes = this.relativeFiles.filter(isSdrSuccess);

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

    ux.table(successes.map(getFileResponseSuccessProps), columns, options);
  }

  private displayFailures(): void {
    if (this.result.response.status === RequestStatus.Succeeded) return;

    const failures = this.getFileResponseFailures();
    if (!failures?.length) return;

    const columns = {
      problemType: { header: 'Type' },
      fullName: { header: 'Name' },
      error: { header: 'Problem' },
      loc: { header: 'Line:Column' },
    };
    const options = { title: error(`Component Failures [${failures.length}]`), 'no-truncate': true };
    ux.log();
    ux.table(
      sortBy(failures, ['problemType', 'fullName', 'lineNumber', 'columnNumber', 'error']).map((f) => ({
        problemType: f.problemType,
        fullName: f.fullName,
        error: f.error,
        loc: f.lineNumber ? `${f.lineNumber}:${f.columnNumber}` : '',
      })),
      columns,
      options
    );
  }
}

const makeKey = (type: string, name: string): string => `${type}#${name}`;

const displayDeletes = (relativeFiles: FileResponse[], extraDeletes: FileResponseSuccess[]): void => {
  const deletions = relativeFiles
    .filter(isSdrSuccess)
    .filter(isFileResponseDeleted)
    .concat(extraDeletes)
    .map(getFileResponseSuccessProps);

  if (!deletions.length) return;

  const columns = {
    fullName: { header: 'Name' },
    type: { header: 'Type' },
    filePath: { header: 'Path' },
  };

  const options = { title: tableHeader('Deleted Source'), 'no-truncate': true };
  ux.log();

  ux.table(deletions, columns, options);
};
