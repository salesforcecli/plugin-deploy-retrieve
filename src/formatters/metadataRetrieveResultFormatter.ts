/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { ux } from '@oclif/core';
import { FileResponse, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { Messages } from '@salesforce/core';
import { Formatter, MetadataRetrieveResultJson } from '../utils/types';
import { sortFileResponses, asRelativePaths } from '../utils/output';

Messages.importMessagesDirectory(__dirname);
export const retrieveMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'retrieve.metadata');

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
