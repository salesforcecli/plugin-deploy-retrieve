/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ux } from '@oclif/core';
import * as chalk from 'chalk';
import { DeployResult, FileResponse } from '@salesforce/source-deploy-retrieve';
import { ensureArray } from '@salesforce/kit';
import { DeleteSourceJson, Formatter } from '../utils/types';
import { sortFileResponses, asRelativePaths } from '../utils/output';

export class DeleteResultFormatter implements Formatter<DeleteSourceJson> {
  public constructor(private result: DeployResult) {}
  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): DeleteSourceJson {
    return {
      ...this.result.response,
      deletedSource: this.result.getFileResponses() ?? [],
      outboundFiles: [],
      deployedSource: [],
      deletes: [Object.assign({}, this.result?.response)],
    };
  }

  public display(): void {
    if ([0, 69].includes(process.exitCode ?? 0)) {
      const successes: FileResponse[] = [];
      const fileResponseSuccesses: Map<string, FileResponse> = new Map<string, FileResponse>();

      if (this.result?.getFileResponses()?.length) {
        const fileResponses: FileResponse[] = [];
        this.result?.getFileResponses().map((f: FileResponse) => {
          fileResponses.push(f);
          fileResponseSuccesses.set(`${f.type}#${f.fullName}`, f);
        });
        sortFileResponses(fileResponses);
        asRelativePaths(fileResponses);
        successes.push(...fileResponses);
      }

      const deployMessages = ensureArray(this.result?.response?.details?.componentSuccesses).filter(
        (item) => !item.fileName.includes('package.xml')
      );
      if (deployMessages.length >= successes.length) {
        // if there's additional successes in the API response, find the success and add it to the output
        deployMessages.map((deployMessage) => {
          if (!fileResponseSuccesses.has(`${deployMessage.componentType}#${deployMessage.fullName}`)) {
            successes.push(
              Object.assign(deployMessage, {
                type: deployMessage.componentType,
              } as FileResponse)
            );
          }
        });
      }

      ux.log('');
      ux.styledHeader(chalk.blue('Deleted Source'));
      ux.table(
        successes.map((entry) => ({
          fullName: entry.fullName,
          type: entry.type,
          filePath: entry.filePath,
        })),
        {
          fullName: { header: 'FULL NAME' },
          type: { header: 'TYPE' },
          filePath: { header: 'PROJECT PATH' },
        }
      );
    }
  }
}
