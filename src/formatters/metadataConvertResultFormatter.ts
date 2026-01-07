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
import path from 'node:path';
import { Ux } from '@salesforce/sf-plugins-core';
import { ConvertResult } from '@salesforce/source-deploy-retrieve';
import { Formatter, ConvertMdapiJson } from '../utils/types.js';

const ux = new Ux();

export class MetadataConvertResultFormatter implements Formatter<ConvertMdapiJson> {
  private convertResults!: ConvertMdapiJson;
  public constructor(private result: ConvertResult) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getJson(): Promise<ConvertMdapiJson> {
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

  public async display(): Promise<void> {
    const convertData = await this.getJson();
    if (convertData?.length) {
      ux.table({
        data: convertData.map((entry) => ({
          state: entry.state,
          fullName: entry.fullName,
          type: entry.type,
          filePath: entry.filePath,
        })),
        columns: [
          { key: 'state', name: 'STATE' },
          { key: 'fullName', name: 'FULL NAME' },
          { key: 'type', name: 'TYPE' },
          { key: 'filePath', name: 'PROJECT PATH' },
        ],
        overflow: 'wrap',
      });
    } else {
      ux.log('No metadata found to convert');
    }
  }
}
