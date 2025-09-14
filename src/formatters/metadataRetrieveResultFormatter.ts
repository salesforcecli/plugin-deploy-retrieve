/*
 * Copyright 2025, Salesforce, Inc.
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
import { join, parse } from 'node:path';

import { Ux } from '@salesforce/sf-plugins-core';
import { FileResponse, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { Messages } from '@salesforce/core';
import { Formatter, MetadataRetrieveResultJson } from '../utils/types.js';
import { fileResponseSortFn, makePathRelative } from '../utils/output.js';

const ux = new Ux();

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
export const retrieveMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'retrieve.start');

export class MetadataRetrieveResultFormatter implements Formatter<MetadataRetrieveResultJson> {
  private zipFilePath: string;
  private files: FileResponse[];
  public constructor(
    private result: RetrieveResult,
    private opts: { 'target-metadata-dir': string; 'zip-file-name': string; unzip: boolean }
  ) {
    this.zipFilePath = join(opts['target-metadata-dir'], opts['zip-file-name']);
    this.files = (this.result.getFileResponses() ?? []).map(makePathRelative).sort(fileResponseSortFn);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getJson(): Promise<MetadataRetrieveResultJson> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { zipFile, ...responseWithoutZipFile } = this.result.response;
    return { ...responseWithoutZipFile, zipFilePath: this.zipFilePath, files: this.files };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async display(): Promise<void> {
    ux.log(retrieveMessages.getMessage('info.WroteZipFile', [this.zipFilePath]));
    if (this.opts.unzip) {
      const extractPath = join(this.opts['target-metadata-dir'], parse(this.opts['zip-file-name']).name);
      ux.log(retrieveMessages.getMessage('info.ExtractedZipFile', [this.zipFilePath, extractPath]));
    }
  }
}
