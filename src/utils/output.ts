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
import { API, TestLevel } from './types';

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

export type PackageRetrieval = {
  name: string;
  path: string;
};

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

export function displaySuccesses(result: DeployResult | RetrieveResult): void {
  const fileResponses = asRelativePaths(result.getFileResponses() ?? []);
  const successes = sortFileResponses(fileResponses.filter((f) => f.state !== 'Failed'));

  if (!successes.length) return;

  const columns = {
    state: { header: 'State' },
    fullName: { header: 'Name' },
    type: { header: 'Type' },
    filePath: { header: 'Path' },
  };
  const title = result instanceof DeployResult ? 'Deployed Source' : 'Retrieved Source';
  const options = { title: info(title) };
  CliUx.ux.log();

  table(successes, columns, options);
}

export function displayPackages(result: RetrieveResult, packages: PackageRetrieval[]): void {
  if (packages?.length) {
    const columns = {
      name: { header: 'Package Name' },
      path: { header: 'Converted Location' },
    };
    const title = 'Retrieved Packages';
    const options = { title: info(title) };
    CliUx.ux.log();
    table(packages, columns, options);
  }
}

export function displayTestResults(result: DeployResult, testLevel: TestLevel, verbose = false): void {
  if (testLevel === TestLevel.NoTestRun) {
    CliUx.ux.log();
    return;
  }

  if (verbose) {
    displayVerboseTestFailures(result);
    displayVerboseTestSuccesses(result);
    displayVerboseTestCoverage(result);
  }

  CliUx.ux.log();
  CliUx.ux.log(info('Test Results Summary'));
  const passing = result.response.numberTestsCompleted ?? 0;
  const failing = result.response.numberTestErrors ?? 0;
  const total = result.response.numberTestsTotal ?? 0;
  const time = result.response.details.runTestResult.totalTime ?? 0;
  CliUx.ux.log(`Passing: ${passing}`);
  CliUx.ux.log(`Failing: ${failing}`);
  CliUx.ux.log(`Total: ${total}`);
  if (time) CliUx.ux.log(`Time: ${time}`);
}

function displayVerboseTestFailures(result: DeployResult): void {
  if (!result.response.numberTestErrors) return;
  const failures = toArray(result.response.details?.runTestResult?.failures);
  const failureCount = result.response.details.runTestResult?.numFailures;
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

function displayVerboseTestSuccesses(result: DeployResult): void {
  const successes = toArray(result.response.details?.runTestResult?.successes);
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

function displayVerboseTestCoverage(result: DeployResult): void {
  const codeCoverage = toArray(result.response.details.runTestResult?.codeCoverage);
  if (codeCoverage.length) {
    const coverage = codeCoverage.sort((a, b) => {
      return a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
    });
    CliUx.ux.log();
    CliUx.ux.log(info('Apex Code Coverage'));
    coverage.map((cov: CodeCoverage & { lineNotCovered: string }) => {
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

export function displayFailures(result: DeployResult | RetrieveResult): void {
  if (result.response.status === RequestStatus.Succeeded) return;

  const fileResponses = asRelativePaths(result.getFileResponses() ?? []);
  const failures = sortFileResponses(fileResponses.filter((f) => f.state === 'Failed'));
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

export function displayDeletes(result: DeployResult): void {
  const fileResponses = asRelativePaths(result.getFileResponses() ?? []);
  const deletions = sortFileResponses(fileResponses.filter((f) => f.state === 'Deleted'));

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

export function getVersionMessage(componentSet: ComponentSet, api: API): string {
  // commands pass in the.componentSet, which may not exist in some tests or mdapi deploys
  if (!componentSet) {
    return `*** Deploying with ${api} ***`;
  }
  // neither
  if (!componentSet.sourceApiVersion && !componentSet.apiVersion) {
    return `*** Deploying with ${api} ***`;
  }
  // either OR both match (SDR will use either)
  if (
    !componentSet.sourceApiVersion ||
    !componentSet.apiVersion ||
    componentSet.sourceApiVersion === componentSet.apiVersion
  ) {
    return `*** Deploying with ${api} API v${componentSet.apiVersion ?? componentSet.sourceApiVersion} ***`;
  }
  // has both but they don't match
  return `*** Deploying v${componentSet.sourceApiVersion} metadata with ${api} API v${componentSet.apiVersion} connection ***`;
}
