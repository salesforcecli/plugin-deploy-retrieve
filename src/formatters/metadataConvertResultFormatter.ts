/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
