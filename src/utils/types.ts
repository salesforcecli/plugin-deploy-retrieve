/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  FileResponse,
  MetadataApiDeployStatus,
  MetadataApiRetrieveStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';

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
  status: RequestStatus | 'Queued';
  files: FileResponse[];
};

export type DeployResultJson = (MetadataApiDeployStatus & { files: FileResponse[] }) | AsyncDeployResultJson;

export type MetadataRetrieveResultJson = Omit<MetadataApiRetrieveStatus, 'zipFile'> & {
  zipFilePath: string;
  files: FileResponse[];
};

export type RetrieveResultJson = (MetadataApiRetrieveStatus & { files: FileResponse[] }) | MetadataRetrieveResultJson;
