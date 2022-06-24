/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import { CliUx } from '@oclif/core';
import { blue, bold, dim, underline } from 'chalk';
import {
  DeployResult,
  FileResponse,
  RetrieveResult,
  RequestStatus,
  Failures,
  Successes,
  ComponentSet,
  CodeCoverage,
} from '@salesforce/source-deploy-retrieve';
import { Messages, NamedPackageDir, SfProject } from '@salesforce/core';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { API, AsyncDeployResultJson, DeployResultJson, RetrieveResultJson, TestLevel, Verbosity } from './types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.async');

function tableHeader(message: string): string {
  return blue(bold(message));
}

function error(message: string): string {
  return StandardColors.error(bold(message));
}

function success(message: string): string {
  return StandardColors.success(bold(message));
}

function table(
  responses: FileResponse[] | CodeCoverage[] | Array<Record<string, unknown>>,
  columns: Record<string, unknown>,
  options?: Record<string, unknown>
): void {
  // Interfaces cannot be casted to Record<string, unknown> so we have to cast to unknown first
  // See https://github.com/microsoft/TypeScript/issues/15300
  CliUx.ux.table(responses as unknown as Array<Record<string, unknown>>, columns, options ?? {});
}

function colorStatus(status: RequestStatus): string {
  if (status === RequestStatus.Succeeded) return StandardColors.success(status);
  if (status === RequestStatus.Failed) return StandardColors.error(status);
  else return StandardColors.warning(status);
}

const check = StandardColors.success('✓');

export function asRelativePaths(fileResponses: FileResponse[]): FileResponse[] {
  const relative = fileResponses.map((file) => {
    return file.filePath ? { ...file, filePath: path.relative(process.cwd(), file.filePath) } : file;
  });

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

export function toArray<T>(entryOrArray: T | T[] | undefined): T[] {
  if (entryOrArray) {
    return Array.isArray(entryOrArray) ? entryOrArray : [entryOrArray];
  }
  return [];
}

export function getVersionMessage(action: string, componentSet: ComponentSet, api: API): string {
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

  public constructor(
    protected result: DeployResult,
    protected flags: Partial<{ 'test-level': TestLevel; verbose: boolean; concise: boolean }>
  ) {
    this.absoluteFiles = sortFileResponses(this.result.getFileResponses() ?? []);
    this.relativeFiles = asRelativePaths(this.absoluteFiles);
    this.testLevel = this.flags['test-level'] || TestLevel.NoTestRun;
    this.verbosity = this.determineVerbosity();
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
      return { ...this.result.response, files: this.absoluteFiles };
    }
  }

  public display(): void {
    if (this.verbosity !== 'concise') {
      this.displaySuccesses();
    }
    this.displayFailures();
    this.displayDeletes();
    this.displayTestResults();
  }

  private displaySuccesses(): void {
    const successes = this.relativeFiles.filter((f) => f.state !== 'Failed');

    if (!successes.length) return;

    const columns = {
      state: { header: 'State' },
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };
    const title = 'Deployed Source';
    const options = { title: tableHeader(title) };
    CliUx.ux.log();

    table(successes, columns, options);
  }

  private displayFailures(): void {
    if (this.result.response.status === RequestStatus.Succeeded) return;

    const failures = this.relativeFiles.filter((f) => f.state === 'Failed');
    if (!failures.length) return;

    const columns = {
      problemType: { header: 'Type' },
      fullName: { header: 'Name' },
      error: { header: 'Problem' },
    };
    const options = { title: error(`Component Failures [${failures.length}]`) };
    CliUx.ux.log();
    table(failures, columns, options);
  }

  private displayDeletes(): void {
    const deletions = this.relativeFiles.filter((f) => f.state === 'Deleted');

    if (!deletions.length) return;

    const columns = {
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };

    const options = { title: tableHeader('Deleted Source') };
    CliUx.ux.log();

    table(deletions, columns, options);
  }

  private displayTestResults(): void {
    if (this.testLevel === TestLevel.NoTestRun) {
      CliUx.ux.log();
      return;
    }

    this.displayVerboseTestFailures();

    if (this.verbosity === 'verbose') {
      this.displayVerboseTestSuccesses();
      this.displayVerboseTestCoverage();
    }

    CliUx.ux.log();
    CliUx.ux.log(tableHeader('Test Results Summary'));
    const passing = this.result.response.numberTestsCompleted ?? 0;
    const failing = this.result.response.numberTestErrors ?? 0;
    const total = this.result.response.numberTestsTotal ?? 0;
    const time = this.result.response.details.runTestResult.totalTime ?? 0;
    CliUx.ux.log(`Passing: ${passing}`);
    CliUx.ux.log(`Failing: ${failing}`);
    CliUx.ux.log(`Total: ${total}`);
    if (time) CliUx.ux.log(`Time: ${time}`);
  }

  private displayVerboseTestSuccesses(): void {
    const successes = toArray(this.result.response.details.runTestResult?.successes);
    if (successes.length > 0) {
      const testSuccesses = sortTestResults(successes) as Successes[];
      CliUx.ux.log();
      CliUx.ux.log(success(`Test Success [${successes.length}]`));
      for (const test of testSuccesses) {
        const testName = underline(`${test.name}.${test.methodName}`);
        CliUx.ux.log(`${check} ${testName}`);
      }
    }
  }

  private displayVerboseTestFailures(): void {
    if (!this.result.response.numberTestErrors) return;
    const failures = toArray(this.result.response.details.runTestResult?.failures);
    const failureCount = this.result.response.details.runTestResult?.numFailures;
    const testFailures = sortTestResults(failures) as Failures[];
    CliUx.ux.log();
    CliUx.ux.log(error(`Test Failures [${failureCount}]`));
    for (const test of testFailures) {
      const testName = underline(`${test.name}.${test.methodName}`);
      const stackTrace = test.stackTrace.replace(/\n/g, `${os.EOL}    `);
      CliUx.ux.log(`• ${testName}`);
      CliUx.ux.log(`  ${dim('message')}: ${test.message}`);
      CliUx.ux.log(`  ${dim('stacktrace')}: ${os.EOL}    ${stackTrace}`);
      CliUx.ux.log();
    }
  }

  private displayVerboseTestCoverage(): void {
    const codeCoverage = toArray(this.result.response.details.runTestResult?.codeCoverage);
    if (codeCoverage.length) {
      const coverage = codeCoverage.sort((a, b) => {
        return a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
      });
      CliUx.ux.log();
      CliUx.ux.log(tableHeader('Apex Code Coverage'));
      coverage.forEach((cov: CodeCoverage & { lineNotCovered: string }) => {
        const numLocationsNum = parseInt(cov.numLocations, 10);
        const numLocationsNotCovered: number = parseInt(cov.numLocationsNotCovered, 10);
        const color = numLocationsNotCovered > 0 ? StandardColors.error : StandardColors.success;

        let pctCovered = 100;
        const coverageDecimal: number = parseFloat(
          ((numLocationsNum - numLocationsNotCovered) / numLocationsNum).toFixed(2)
        );
        if (numLocationsNum > 0) {
          pctCovered = coverageDecimal * 100;
        }
        cov.numLocations = color(`${pctCovered}%`);

        if (!cov.locationsNotCovered) {
          cov.lineNotCovered = '';
        }
        const locations = toArray(cov.locationsNotCovered);
        cov.lineNotCovered = locations.map((location) => location.line).join(',');
      });

      table(coverage, {
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
    CliUx.ux.log(`${this.result.response.id}... ${this.result.response.status}`);

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

    CliUx.ux.log();
    CliUx.ux.table(response, { key: {}, value: {} }, { title: tableHeader('Deploy Info') });

    const opts = Object.entries(this.flags).reduce<Array<{ key: string; value: unknown }>>((result, [key, value]) => {
      if (key === 'timestamp') return result;
      return result.concat({ key, value });
    }, []);
    CliUx.ux.log();
    CliUx.ux.table(opts, { key: {}, value: {} }, { title: tableHeader('Deploy Options') });
    super.display();
  }
}

export class AsyncDeployResultFormatter implements Formatter<AsyncDeployResultJson> {
  public constructor(private id: string) {}

  public getJson(): AsyncDeployResultJson {
    return { id: this.id, done: false, status: 'Queued', files: [] };
  }

  public display(): void {
    CliUx.ux.log(messages.getMessage('info.AsyncDeployQueued'));
    CliUx.ux.log();
    CliUx.ux.log(messages.getMessage('info.AsyncDeployResume', [this.id]));
    CliUx.ux.log(messages.getMessage('info.AsyncDeployStatus', [this.id]));
    CliUx.ux.log(messages.getMessage('info.AsyncDeployCancel', [this.id]));
  }
}

export class DeployCancelResultFormatter implements Formatter<DeployResultJson> {
  public constructor(protected result: DeployResult) {}

  public getJson(): DeployResultJson {
    return { ...this.result.response, files: this.result.getFileResponses() ?? [] };
  }

  public display(): void {
    if (this.result.response.status === RequestStatus.Canceled) {
      CliUx.ux.log(`Successfully canceled ${this.result.response.id}`);
    } else {
      CliUx.ux.error(`Could not cancel ${this.result.response.id}`);
    }
  }
}

export class AsyncDeployCancelResultFormatter implements Formatter<AsyncDeployResultJson> {
  public constructor(private id: string) {}

  public getJson(): DeployResultJson {
    return { id: this.id, done: false, status: 'Queued', files: [] };
  }

  public display(): void {
    CliUx.ux.log(messages.getMessage('info.AsyncDeployCancelQueued'));
    CliUx.ux.log(messages.getMessage('info.AsyncDeployResume', [this.id]));
    CliUx.ux.log(messages.getMessage('info.AsyncDeployStatus', [this.id]));
  }
}

export class RetrieveResultFormatter implements Formatter<RetrieveResultJson> {
  private files: FileResponse[];
  public constructor(private result: RetrieveResult, private packageNames: string[]) {
    this.files = sortFileResponses(asRelativePaths(this.result.getFileResponses() ?? []));
  }

  public getJson(): RetrieveResultJson {
    return { ...this.result.response, files: this.files };
  }

  public async display(): Promise<void> {
    this.displaySuccesses();
    await this.displayPackages();
  }

  private displaySuccesses(): void {
    const successes = this.files.filter((f) => f.state !== 'Failed');

    if (!successes.length) return;

    const columns = {
      state: { header: 'State' },
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };
    const title = 'Retrieved Source';
    const options = { title: tableHeader(title) };
    CliUx.ux.log();

    table(successes, columns, options);
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
      CliUx.ux.log();
      table(packages, columns, options);
    }
  }

  private async getPackages(): Promise<NamedPackageDir[]> {
    const packages: NamedPackageDir[] = [];
    const projectPath = await SfProject.resolveProjectPath();
    this.packageNames?.forEach((name) => {
      const packagePath = path.join(projectPath, name);
      packages.push({ name, path: packagePath, fullPath: path.resolve(packagePath) });
    });
    return packages;
  }
}
