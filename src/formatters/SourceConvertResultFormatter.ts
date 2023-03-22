/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { resolve } from 'path';
import { ux } from '@oclif/core';
import { ConvertResult } from '@salesforce/source-deploy-retrieve';
import { SfError, Messages } from '@salesforce/core';
import { ConvertResultJson, Formatter } from '../utils/types';

Messages.importMessagesDirectory(__dirname);
export const convertMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.source');

export class SourceConvertResultFormatter implements Formatter<ConvertResultJson> {
  public constructor(private result: ConvertResult) {}
  public getJson(): ConvertResultJson {
    if (!this.result.packagePath) {
      throw new SfError('Convert result contains no packagePath');
    }
    return {
      location: resolve(this.result.packagePath),
    };
  }

  public display(): void {
    if ([0, 69].includes(process.exitCode ?? 0)) {
      ux.log(convertMessages.getMessage('success', [this.result.packagePath]));
    } else {
      throw new SfError(convertMessages.getMessage('convertFailed'), 'ConvertFailed');
    }
  }
}
