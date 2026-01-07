/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as path from 'node:path';
import {
  ApexTestResultData,
  ApexTestResultOutcome,
  CoverageReportFormats,
  CoverageReporterOptions,
  DefaultReportOptions,
  ApexCodeCoverageAggregate,
  ApexCodeCoverageAggregateRecord,
} from '@salesforce/apex-node';
import type { Successes, Failures, CodeCoverage } from '@salesforce/source-deploy-retrieve';
import { ensureArray } from '@salesforce/kit';
import { StandardColors } from '@salesforce/sf-plugins-core';

export const mapTestResults = <T extends Failures | Successes>(testResults: T[]): ApexTestResultData[] =>
  testResults.map((testResult) => ({
    apexClass: { fullName: testResult.name, id: testResult.id, name: testResult.name, namespacePrefix: '' },
    apexLogId: '',
    asyncApexJobId: '',
    fullName: testResult.name,
    id: testResult.id,
    ...('message' in testResult && testResult.message
      ? { message: testResult.message, outcome: ApexTestResultOutcome.Fail }
      : { message: null, outcome: ApexTestResultOutcome.Pass }),
    methodName: testResult.methodName,
    queueItemId: '',
    runTime: parseInt(testResult.time, 10),
    stackTrace: 'stackTrace' in testResult ? testResult.stackTrace : null,
    testTimestamp: '',
  }));

export const generateCoveredLines = (cov: CodeCoverage): [number[], number[]] => {
  const [lineCount] = getCoverageNumbers(cov);
  const uncoveredLines = ensureArray(cov.locationsNotCovered).map((location) => parseInt(location.line, 10));
  const minLineNumber = uncoveredLines.length ? Math.min(...uncoveredLines) : 1;
  const lines = [...Array(lineCount).keys()].map((i) => i + minLineNumber);
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
  const apexCoverage = mdCoverage.map((cov): ApexCodeCoverageAggregateRecord => {
    const [NumLinesCovered, NumLinesUncovered] = getCoverageNumbers(cov);
    const [uncoveredLines, coveredLines] = generateCoveredLines(cov);

    return {
      ApexClassOrTrigger: {
        Id: cov.id,
        Name: cov.name,
      },
      NumLinesCovered,
      NumLinesUncovered,
      Coverage: {
        coveredLines,
        uncoveredLines,
      },
    };
  });
  return { done: true, totalSize: apexCoverage.length, records: apexCoverage };
};

export const coverageOutput = (
  cov: CodeCoverage
): Pick<CodeCoverage, 'name'> & { coveragePercent: string; linesNotCovered: string } => ({
  name: cov.name,
  coveragePercent: formatPercent(getCoveragePct(cov)),
  linesNotCovered: cov.locationsNotCovered
    ? ensureArray(cov.locationsNotCovered)
        .map((location) => location.line)
        .join(',')
    : '',
});

const color = (percent: number): typeof StandardColors.success =>
  percent >= 90 ? StandardColors.success : percent >= 75 ? StandardColors.warning : StandardColors.error;

const formatPercent = (percent: number): string => color(percent)(`${percent}%`);

export const getCoveragePct = (cov: CodeCoverage): number => {
  const [lineCount, uncoveredLineCount] = getCoverageNumbers(cov);
  const coverageDecimal = parseFloat(((lineCount - uncoveredLineCount) / lineCount).toFixed(2));

  return lineCount > 0 ? coverageDecimal * 100 : 100;
};

/** returns the number of total line for which coverage should apply, and the total uncovered line  */
export const getCoverageNumbers = (cov: CodeCoverage): [lineCount: number, uncoveredLineCount: number] => [
  parseInt(cov.numLocations, 10),
  parseInt(cov.numLocationsNotCovered, 10),
];
