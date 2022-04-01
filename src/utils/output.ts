/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import { CliUx } from '@oclif/core';
import { blue, bold, dim, red, underline, green } from 'chalk';
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
import { NamedPackageDir, SfProject } from '@salesforce/core';
import { API, DeployResultJson, RetrieveResultJson, TestLevel, Verbosity } from './types';

function info(message: string): string {
  return blue(bold(message));
}

function error(message: string): string {
  return red(bold(message));
}

function success(message: string): string {
  return green(bold(message));
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

const check = green('✓');

export function asRelativePaths(fileResponses: FileResponse[]): FileResponse[] {
  fileResponses.forEach((file) => {
    if (file.filePath) {
      file.filePath = path.relative(process.cwd(), file.filePath);
    }
  });
  return fileResponses;
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

export class DeployResultFormatter {
  private files: FileResponse[];
  private testLevel: TestLevel;
  private verbosity: Verbosity;

  public constructor(
    private result: DeployResult,
    private flags: Partial<{ 'test-level': TestLevel; verbose: boolean; concise: boolean }>
  ) {
    this.files = sortFileResponses(asRelativePaths(this.result.getFileResponses() ?? []));
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
        files: this.files.filter((f) => f.state === 'Failed'),
      };
    } else {
      return { ...this.result.response, files: this.files };
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
    const successes = this.files.filter((f) => f.state !== 'Failed');

    if (!successes.length) return;

    const columns = {
      state: { header: 'State' },
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };
    const title = 'Deployed Source';
    const options = { title: info(title) };
    CliUx.ux.log();

    table(successes, columns, options);
  }

  private displayFailures(): void {
    if (this.result.response.status === RequestStatus.Succeeded) return;

    const failures = this.files.filter((f) => f.state === 'Failed');
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
    const deletions = this.files.filter((f) => f.state === 'Deleted');

    if (!deletions.length) return;

    const columns = {
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };

    const options = { title: info('Deleted Source') };
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
    CliUx.ux.log(info('Test Results Summary'));
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
      CliUx.ux.log(info('Apex Code Coverage'));
      coverage.forEach((cov: CodeCoverage & { lineNotCovered: string }) => {
        const numLocationsNum = parseInt(cov.numLocations, 10);
        const numLocationsNotCovered: number = parseInt(cov.numLocationsNotCovered, 10);
        const color = numLocationsNotCovered > 0 ? red : green;

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

export class RetrieveResultFormatter {
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
    const options = { title: info(title) };
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
      const options = { title: info(title) };
      CliUx.ux.log();
      table(packages, columns, options);
    }
  }

  private async getPackages(): Promise<NamedPackageDir[]> {
    const packages: NamedPackageDir[] = [];
    const projectPath = await SfProject.resolveProjectPath();
    this.packageNames.forEach((name) => {
      const packagePath = path.join(projectPath, name);
      packages.push({ name, path: packagePath, fullPath: path.resolve(packagePath) });
    });
    return packages;
  }
}
