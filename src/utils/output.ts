/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import { resolve } from 'path';
import * as fs from 'fs';
import { ux } from '@oclif/core';
import * as chalk from 'chalk';
import { blue, bold, dim, underline } from 'chalk';
import {
  CodeCoverage,
  ComponentSet,
  ConvertResult,
  DeployResult,
  Failures,
  FileResponse,
  FileResponseSuccess,
  RequestStatus,
  RetrieveResult,
  RunTestResult,
  Successes,
} from '@salesforce/source-deploy-retrieve';
import { Messages, NamedPackageDir, SfError, SfProject, Org } from '@salesforce/core';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { ensureArray } from '@salesforce/kit';
import {
  CodeCoverageResult,
  CoverageReporter,
  CoverageReporterOptions,
  JUnitReporter,
  TestResult,
} from '@salesforce/apex-node';
import {
  API,
  AsyncDeployResultJson,
  ConvertMdapiJson,
  ConvertResultJson,
  DeleteSourceJson,
  DeployResultJson,
  isSdrFailure,
  isSdrSuccess,
  MetadataRetrieveResultJson,
  RetrieveResultJson,
  TestLevel,
  Verbosity,
} from './types';
import {
  generateCoveredLines,
  getCoverageFormattersOptions,
  mapTestResults,
  transformCoverageToApexCoverage,
} from './coverage';

Messages.importMessagesDirectory(__dirname);
const deployAsyncMessages = Messages.load('@salesforce/plugin-deploy-retrieve', 'deploy.async', [
  'info.AsyncDeployResume',
  'info.AsyncDeployStatus',
  'info.AsyncDeployCancel',
  'info.AsyncDeployQueued',
  'info.AsyncDeployCancelQueued',
]);

const retrieveMessages = Messages.load('@salesforce/plugin-deploy-retrieve', 'retrieve.metadata', [
  'info.WroteZipFile',
  'info.ExtractedZipFile',
]);

const convertMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.source');

function tableHeader(message: string): string {
  return blue(bold(message));
}

function error(message: string): string {
  return StandardColors.error(bold(message));
}

function success(message: string): string {
  return StandardColors.success(bold(message));
}

function colorStatus(status: RequestStatus): string {
  if (status === RequestStatus.Succeeded) return StandardColors.success(status);
  if (status === RequestStatus.Failed) return StandardColors.error(status);
  else return StandardColors.warning(status);
}

const check = StandardColors.success('✓');

export function asRelativePaths(fileResponses: FileResponse[]): FileResponse[] {
  const relative = fileResponses.map((file) =>
    file.filePath ? { ...file, filePath: path.relative(process.cwd(), file.filePath) } : file
  );

  return relative;
}
/**
 * Sorts file responds by type, then by filePath, then by fullName
 */
export function sortFileResponses(fileResponses: FileResponse[]): FileResponse[] {
  return fileResponses.sort((i, j) => {
    if (i.type === j.type && i.filePath && j.filePath) {
      if (i.filePath === j.filePath) {
        return i.fullName > j.fullName ? 1 : -1;
      }
      return i?.filePath > j?.filePath ? 1 : -1;
    }
    return i.type > j.type ? 1 : -1;
  });
}

export function sortTestResults(results: Failures[] | Successes[] = []): Failures[] | Successes[] {
  return results.sort((a, b) => {
    if (a.methodName === b.methodName) {
      return a.name.localeCompare(b.name);
    }
    return a.methodName.localeCompare(b.methodName);
  });
}

export function getVersionMessage(action: string, componentSet: ComponentSet | undefined, api: API): string {
  // commands pass in the.componentSet, which may not exist in some tests or mdapi deploys
  if (!componentSet) {
    return `*** ${action} with ${api} ***`;
  }
  // neither
  if (!componentSet.sourceApiVersion && !componentSet.apiVersion) {
    return `*** ${action} with ${api} ***`;
  }
  // either OR both match (SDR will use either)
  if (
    !componentSet.sourceApiVersion ||
    !componentSet.apiVersion ||
    componentSet.sourceApiVersion === componentSet.apiVersion
  ) {
    return `*** ${action} with ${api} API v${componentSet.apiVersion ?? componentSet.sourceApiVersion} ***`;
  }
  // has both but they don't match
  return `*** ${action} v${componentSet.sourceApiVersion} metadata with ${api} API v${componentSet.apiVersion} connection ***`;
}

interface Formatter<T> {
  getJson: () => T;
  display: () => void;
}

export class DeployResultFormatter implements Formatter<DeployResultJson> {
  private relativeFiles: FileResponse[];
  private absoluteFiles: FileResponse[];
  private testLevel: TestLevel;
  private verbosity: Verbosity;
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
    this.absoluteFiles = sortFileResponses(this.result.getFileResponses() ?? []);
    this.relativeFiles = asRelativePaths(this.absoluteFiles);
    this.testLevel = this.flags['test-level'] ?? TestLevel.NoTestRun;
    this.verbosity = this.determineVerbosity();
    this.resultsDir = this.flags['results-dir'] ?? 'coverage';
    this.coverageOptions = getCoverageFormattersOptions(this.flags['coverage-formatters']);
    this.junit = this.flags.junit;
  }

  public getJson(): DeployResultJson {
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
        ...(this.result.replacements.size
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

  private maybeCreateRequestedReports(): void {
    // only generate reports if test results are presented
    if (this.result.response?.numberTestsTotal) {
      if (this.coverageOptions) {
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
    const runTestResult = this.result.response?.details?.runTestResult as RunTestResult;
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
      codecoverage: ensureArray(runTestResult?.codeCoverage).map((cov) => {
        const codeCoverageResult: CodeCoverageResult = {} as CodeCoverageResult;
        codeCoverageResult.apexId = cov.id;
        codeCoverageResult.name = cov.name;
        codeCoverageResult.numLinesUncovered = parseInt(cov.numLocationsNotCovered, 10);
        codeCoverageResult.numLinesCovered = parseInt(cov.numLocations, 10) - codeCoverageResult.numLinesUncovered;
        const [uncoveredLines, coveredLines] = generateCoveredLines(cov);
        codeCoverageResult.coveredLines = coveredLines;
        codeCoverageResult.uncoveredLines = uncoveredLines;
        const numLocationsNum = parseInt(cov.numLocations, 10);
        const numLocationsNotCovered: number = parseInt(cov.numLocationsNotCovered, 10);

        codeCoverageResult.percentage =
          numLocationsNum > 0
            ? (((numLocationsNum - numLocationsNotCovered) / numLocationsNum) * 100).toFixed() + '%'
            : '';
        return codeCoverageResult;
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
    const title = 'Deployed Source';
    const options = { title: tableHeader(title) };
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
    if (!failures.length) return;

    const columns = {
      problemType: { header: 'Type' },
      fullName: { header: 'Name' },
      error: { header: 'Problem' },
    };
    const options = { title: error(`Component Failures [${failures.length}]`) };
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

    const options = { title: tableHeader('Deleted Source') };
    ux.log();

    ux.table(getFileResponseSuccessProps(deletions), columns, options);
  }

  private displayTestResults(): void {
    if (this.testLevel === TestLevel.NoTestRun) {
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
    const passing = this.result.response.numberTestsCompleted ?? 0;
    const failing = this.result.response.numberTestErrors ?? 0;
    const total = this.result.response.numberTestsTotal ?? 0;
    const time = this.result.response.details.runTestResult?.totalTime ?? 0;
    ux.log(`Passing: ${passing}`);
    ux.log(`Failing: ${failing}`);
    ux.log(`Total: ${total}`);
    if (time) ux.log(`Time: ${time}`);
  }

  private displayVerboseTestSuccesses(): void {
    const successes = ensureArray(this.result.response.details.runTestResult?.successes);
    if (successes.length > 0) {
      const testSuccesses = sortTestResults(successes) as Successes[];
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
    const testFailures = sortTestResults(failures) as Failures[];
    ux.log();
    ux.log(error(`Test Failures [${failureCount}]`));
    for (const test of testFailures) {
      const testName = underline(`${test.name}.${test.methodName}`);
      const stackTrace = test.stackTrace.replace(/\n/g, `${os.EOL}    `);
      ux.log(`• ${testName}`);
      ux.log(`  ${dim('message')}: ${test.message}`);
      ux.log(`  ${dim('stacktrace')}: ${os.EOL}    ${stackTrace}`);
      ux.log();
    }
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

  private determineVerbosity(): Verbosity {
    if (this.flags.verbose) return 'verbose';
    if (this.flags.concise) return 'concise';
    return 'normal';
  }
}

export class DeployReportResultFormatter extends DeployResultFormatter {
  public display(): void {
    ux.log(`${this.result.response.id}... ${this.result.response.status}`);

    const response = Object.entries(this.result.response).reduce<Array<{ key: string; value: unknown }>>(
      (result, [key, value]) => {
        if (['number', 'boolean', 'string'].includes(typeof value)) {
          if (key === 'status') {
            return result.concat({ key, value: colorStatus(value as RequestStatus) });
          } else {
            return result.concat({ key, value: value as string | number | boolean });
          }
        }
        return result;
      },
      []
    );

    ux.log();
    ux.table(response, { key: {}, value: {} }, { title: tableHeader('Deploy Info') });

    const opts = Object.entries(this.flags).reduce<Array<{ key: string; value: unknown }>>((result, [key, value]) => {
      if (key === 'timestamp') return result;
      return result.concat({ key, value });
    }, []);
    ux.log();
    ux.table(opts, { key: {}, value: {} }, { title: tableHeader('Deploy Options') });
    super.display();
  }
}

export class AsyncDeployResultFormatter implements Formatter<AsyncDeployResultJson> {
  public constructor(private id: string) {}

  public getJson(): AsyncDeployResultJson {
    return { id: this.id, done: false, status: 'Queued', files: [] };
  }

  public display(): void {
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployQueued'));
    ux.log();
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployResume', [this.id]));
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployStatus', [this.id]));
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployCancel', [this.id]));
  }
}

export class DeployCancelResultFormatter implements Formatter<DeployResultJson> {
  public constructor(protected result: DeployResult) {}

  public getJson(): DeployResultJson {
    return { ...this.result.response, files: this.result.getFileResponses() ?? [] };
  }

  public display(): void {
    if (this.result.response.status === RequestStatus.Canceled) {
      ux.log(`Successfully canceled ${this.result.response.id}`);
    } else {
      ux.error(`Could not cancel ${this.result.response.id}`);
    }
  }
}

export class SourceConvertResultFormatter implements Formatter<ConvertResultJson> {
  public constructor(private result: ConvertResult) {}
  public getJson(): ConvertResultJson {
    return {
      location: resolve(this.result.packagePath as string),
    };
  }

  public display(): void {
    if ([0, 69].includes(process.exitCode ?? 0)) {
      ux.log(convertMessages.getMessage('success', [this.result.packagePath]));
    } else {
      throw new SfError(convertMessages.getMessage('convertFailed'), 'ConvertFailed');
    }
  }
}

export class MetadataConvertResultFormatter implements Formatter<ConvertMdapiJson> {
  private convertResults!: ConvertMdapiJson;
  public constructor(private result: ConvertResult) {}

  public getJson(): ConvertMdapiJson {
    this.convertResults = [];
    this.result?.converted?.forEach((component) => {
      if (component.xml) {
        this.convertResults.push({
          fullName: component.fullName,
          type: component.type.name,
          filePath: path.relative('.', component.xml),
          state: 'Add',
        });
      }
      if (component.content) {
        this.convertResults.push({
          fullName: component.fullName,
          type: component.type.name,
          filePath: path.relative('.', component.content),
          state: 'Add',
        });
      }
    });

    return this.convertResults;
  }

  public display(): void {
    const convertData = this.getJson();
    if (convertData?.length) {
      ux.table(
        convertData.map((entry) => ({
          state: entry.state,
          fullName: entry.fullName,
          type: entry.type,
          filePath: entry.filePath,
        })),
        {
          state: { header: 'STATE' },
          fullName: { header: 'FULL NAME' },
          type: { header: 'TYPE' },
          filePath: { header: 'PROJECT PATH' },
        }
      );
    } else {
      ux.log('No metadata found to convert');
    }
  }
}

export class AsyncDeployCancelResultFormatter implements Formatter<AsyncDeployResultJson> {
  public constructor(private id: string) {}

  public getJson(): DeployResultJson {
    return { id: this.id, done: false, status: 'Queued', files: [] };
  }

  public display(): void {
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployCancelQueued'));
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployResume', [this.id]));
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployStatus', [this.id]));
  }
}

export class RetrieveResultFormatter implements Formatter<RetrieveResultJson> {
  private files: FileResponse[];
  public constructor(
    private result: RetrieveResult,
    private packageNames: string[] = [],
    deleteResponses: FileResponse[] = []
  ) {
    this.files = sortFileResponses(asRelativePaths((this.result.getFileResponses() ?? []).concat(deleteResponses)));
  }

  public getJson(): RetrieveResultJson {
    const { zipFile, ...responseWithoutZip } = this.result.response;
    return { ...responseWithoutZip, files: this.files };
  }

  public async display(): Promise<void> {
    this.displaySuccesses();
    await this.displayPackages();
  }

  private displaySuccesses(): void {
    const successes = this.files.filter(isSdrSuccess);

    if (!successes.length) return;

    const columns = {
      state: { header: 'State' },
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };
    const title = 'Retrieved Source';
    const options = { title: tableHeader(title) };
    ux.log();

    ux.table(getFileResponseSuccessProps(successes), columns, options);
  }

  private async displayPackages(): Promise<void> {
    const packages = await this.getPackages();
    if (packages?.length) {
      const columns = {
        name: { header: 'Package Name' },
        fullPath: { header: 'Converted Location' },
      };
      const title = 'Retrieved Packages';
      const options = { title: tableHeader(title) };
      ux.log();
      ux.table(packages, columns, options);
    }
  }

  private async getPackages(): Promise<NamedPackageDir[]> {
    const projectPath = await SfProject.resolveProjectPath();
    return this.packageNames.map((name) => {
      const packagePath = path.join(projectPath, name);
      return { name, path: packagePath, fullPath: path.resolve(packagePath) };
    });
  }
}

export class DeleteResultFormatter implements Formatter<DeleteSourceJson> {
  public constructor(private result: DeployResult) {}
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
        }
      );
    }
  }
}

export class MetadataRetrieveResultFormatter implements Formatter<MetadataRetrieveResultJson> {
  private zipFilePath: string;
  private files: FileResponse[];
  public constructor(
    private result: RetrieveResult,
    private opts: { 'target-metadata-dir': string; 'zip-file-name': string; unzip: boolean }
  ) {
    this.zipFilePath = path.join(opts['target-metadata-dir'], opts['zip-file-name']);
    this.files = sortFileResponses(asRelativePaths(this.result.getFileResponses() ?? []));
  }

  public getJson(): MetadataRetrieveResultJson {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { zipFile, ...responseWithoutZipFile } = this.result.response;
    return { ...responseWithoutZipFile, zipFilePath: this.zipFilePath, files: this.files };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async display(): Promise<void> {
    ux.log(retrieveMessages.getMessage('info.WroteZipFile', [this.zipFilePath]));
    if (this.opts.unzip) {
      const extractPath = path.join(this.opts['target-metadata-dir'], path.parse(this.opts['zip-file-name']).name);
      ux.log(retrieveMessages.getMessage('info.ExtractedZipFile', [this.zipFilePath, extractPath]));
    }
  }
}

const getFileResponseSuccessProps = (
  successes: FileResponseSuccess[]
): Array<Pick<FileResponseSuccess, 'filePath' | 'fullName' | 'state' | 'type'>> =>
  successes.map((s) => ({ filePath: s.filePath, fullName: s.fullName, type: s.type, state: s.state }));

const coverageOutput = (
  cov: CodeCoverage
): Pick<CodeCoverage, 'name' | 'numLocations'> & { lineNotCovered: string } => {
  const numLocationsNum = parseInt(cov.numLocations, 10);
  const numLocationsNotCovered: number = parseInt(cov.numLocationsNotCovered, 10);
  const color = numLocationsNotCovered > 0 ? StandardColors.error : StandardColors.success;

  let pctCovered = 100;
  const coverageDecimal: number = parseFloat(((numLocationsNum - numLocationsNotCovered) / numLocationsNum).toFixed(2));
  if (numLocationsNum > 0) {
    pctCovered = coverageDecimal * 100;
  }
  // cov.numLocations = color(`${pctCovered}%`);
  const base = {
    name: cov.name,
    numLocations: color(`${pctCovered}%`),
  };

  if (!cov.locationsNotCovered) {
    return { ...base, lineNotCovered: '' };
  }
  const locations = ensureArray(cov.locationsNotCovered);

  return {
    ...base,
    lineNotCovered: locations.map((location) => location.line).join(','),
  };
};
