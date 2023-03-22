/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';

import {
  ApexTestResultData,
  ApexTestResultOutcome,
  CoverageReportFormats,
  CoverageReporterOptions,
  DefaultReportOptions,
  ApexCodeCoverageAggregate,
  ApexCodeCoverageAggregateRecord,
} from '@salesforce/apex-node';
import { Successes, Failures, CodeCoverage } from '@salesforce/source-deploy-retrieve';
import { ensureArray } from '@salesforce/kit';
import { StandardColors } from '@salesforce/sf-plugins-core';

type SuccessOrFailure = Successes & Failures;

export const mapTestResults = (testResults: Failures[] | Successes[]): ApexTestResultData[] =>
  testResults.map((successOrFailure) => {
    const testResult = successOrFailure as SuccessOrFailure;
    return {
      apexClass: { fullName: testResult.name, id: testResult.id, name: testResult.name, namespacePrefix: '' },
      apexLogId: '',
      asyncApexJobId: '',
      fullName: testResult.name,
      id: testResult.id,
      message: testResult.message ?? '',
      methodName: testResult.methodName,
      outcome: !testResult.message ? ApexTestResultOutcome.Pass : ApexTestResultOutcome.Fail,
      queueItemId: '',
      runTime: parseInt(testResult.time, 10),
      stackTrace: testResult.stackTrace || '',
      testTimestamp: '',
    };
  });

export const generateCoveredLines = (cov: CodeCoverage): [number[], number[]] => {
  const numCovered = parseInt(cov.numLocations, 10);
  const numUncovered = parseInt(cov.numLocationsNotCovered, 10);
  const uncoveredLines = ensureArray(cov.locationsNotCovered).map((location) => parseInt(location.line, 10));
  const minLineNumber = uncoveredLines.length ? Math.min(...uncoveredLines) : 1;
  const lines = [...Array(numCovered + numUncovered).keys()].map((i) => i + minLineNumber);
  const coveredLines = lines.filter((line) => !uncoveredLines.includes(line));
  return [uncoveredLines, coveredLines];
};

export const getCoverageFormattersOptions = (formatters: string[] = []): CoverageReporterOptions => {
  const reportFormats = formatters as CoverageReportFormats[];
  const reportOptions = Object.fromEntries(
    reportFormats.map((format) => {
      const formatDefaults = DefaultReportOptions[format];
      return [
        format,
        {
          ...formatDefaults,
          // always join any subdir from the defaults with our custom coverage dir
          ...('subdir' in formatDefaults ? { subdir: path.join('coverage', formatDefaults.subdir) } : {}),
          // if there is no subdir, we also put the file in the coverage dir, otherwise leave it alone
          ...('file' in formatDefaults && !('subdir' in formatDefaults)
            ? { file: path.join('coverage', formatDefaults.file) }
            : {}),
        },
      ];
    })
  );
  return {
    reportFormats,
    reportOptions,
  };
};

export const transformCoverageToApexCoverage = (mdCoverage: CodeCoverage[]): ApexCodeCoverageAggregate => {
  const apexCoverage = mdCoverage.map((cov) => {
    const numCovered = parseInt(cov.numLocations, 10);
    const numUncovered = parseInt(cov.numLocationsNotCovered, 10);
    const [uncoveredLines, coveredLines] = generateCoveredLines(cov);

    const ac: ApexCodeCoverageAggregateRecord = {
      ApexClassOrTrigger: {
        Id: cov.id,
        Name: cov.name,
      },
      NumLinesCovered: numCovered,
      NumLinesUncovered: numUncovered,
      Coverage: {
        coveredLines,
        uncoveredLines,
      },
    };
    return ac;
  });
  return { done: true, totalSize: apexCoverage.length, records: apexCoverage };
};

export const coverageOutput = (
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
