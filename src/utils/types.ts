/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ComponentStatus,
  FileResponse,
  MetadataApiDeployStatus,
  MetadataApiRetrieveStatus,
  RequestStatus,
  SourceComponent,
  FileResponseFailure,
  FileResponseSuccess,
} from '@salesforce/source-deploy-retrieve';
import { isObject } from '@salesforce/ts-types';
import { DefaultReportOptions, CoverageReporterOptions } from '@salesforce/apex-node';

export const reportsFormatters = Object.keys(DefaultReportOptions);

export enum TestLevel {
  NoTestRun = 'NoTestRun',
  RunSpecifiedTests = 'RunSpecifiedTests',
  RunLocalTests = 'RunLocalTests',
  RunAllTestsInOrg = 'RunAllTestsInOrg',
}

export enum API {
  SOAP = 'SOAP',
  REST = 'REST',
}

export type PathInfo = {
  type: 'directory' | 'file';
  path: string;
};

export type Verbosity = 'verbose' | 'concise' | 'normal';

export type AsyncDeployResultJson = Omit<Partial<MetadataApiDeployStatus>, 'status'> & {
  status: RequestStatus | 'Queued' | 'Nothing to deploy';
  files: FileResponse[];
};

type ConvertEntry = {
  fullName: string;
  type: string;
  filePath: string;
  state: 'Add';
};

export type ConvertMdapiJson = ConvertEntry[];

export type ConvertResultJson = {
  location: string;
};

export interface DeleteFormatterOptions {
  verbose?: boolean;
  quiet?: boolean;
  waitTime?: number;
  concise?: boolean;
  username?: string;
  coverageOptions?: CoverageReporterOptions;
  junitTestResults?: boolean;
  resultsDir?: string;
  testsRan?: boolean;
}

export type DeleteSourceJson = {
  deletedSource?: FileResponse[];
  deployedSource: FileResponse[];
  outboundFiles: string[];
  deploys?: MetadataApiDeployStatus[];
  deletes?: MetadataApiDeployStatus[];
  replacements?: Record<string, string[]>;
  coverage?: CoverageResultsFileInfo;
  junit?: string;
} & MetadataApiDeployStatus;

export type CoverageResultsFileInfo = Record<keyof Partial<typeof DefaultReportOptions>, string>;

export type DeployResultJson =
  | (MetadataApiDeployStatus & { files: FileResponse[] } & { replacements?: Record<string, string[]> })
  | AsyncDeployResultJson;

export type MetadataRetrieveResultJson = Omit<MetadataApiRetrieveStatus, 'zipFile'> & {
  zipFilePath: string;
  files: FileResponse[];
};

export type RetrieveResultJson =
  | (Omit<MetadataApiRetrieveStatus, 'zipFile'> & { files: FileResponse[] })
  | MetadataRetrieveResultJson;

export type Formatter<T> = {
  getJson: () => T;
  display: () => void;
};

/** validates source component with fullname, type, and xml props */
export const isSourceComponent = (sc: unknown): sc is SourceComponent & { xml: string } =>
  isObject(sc) && 'fullName' in sc && 'type' in sc && 'xml' in sc;

export const isSdrFailure = (fileResponse: FileResponse): fileResponse is FileResponseFailure =>
  fileResponse.state === ComponentStatus.Failed;

export const isSdrSuccess = (fileResponse: FileResponse): fileResponse is FileResponseSuccess =>
  fileResponse.state !== ComponentStatus.Failed;
