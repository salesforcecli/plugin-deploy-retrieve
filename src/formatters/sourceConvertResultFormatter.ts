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
import { resolve } from 'node:path';

import { Ux } from '@salesforce/sf-plugins-core';
import { ConvertResult } from '@salesforce/source-deploy-retrieve';
import { SfError, Messages } from '@salesforce/core';
import { ConvertResultJson, Formatter } from '../utils/types.js';
import { exitCodeAsNumber } from '../utils/output.js';

const ux = new Ux();

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
export const convertMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.source');

export class SourceConvertResultFormatter implements Formatter<ConvertResultJson> {
  public constructor(private result: ConvertResult) {}
  // eslint-disable-next-line @typescript-eslint/require-await
  public async getJson(): Promise<ConvertResultJson> {
    if (!this.result.packagePath) {
      throw new SfError('Convert result contains no packagePath');
    }
    return {
      location: resolve(this.result.packagePath),
    };
  }

  public display(): void {
    if ([0, 69].includes(exitCodeAsNumber() ?? 0)) {
      ux.log(convertMessages.getMessage('success', [this.result.packagePath]));
    } else {
      throw new SfError(convertMessages.getMessage('convertFailed'), 'ConvertFailed');
    }
  }
}
