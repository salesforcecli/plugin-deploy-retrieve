/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ux } from '@oclif/core';
import { DeployResult, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson, Formatter } from '../utils/types.js';

export class DeployCancelResultFormatter implements Formatter<DeployResultJson> {
  public constructor(protected result: DeployResult) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getJson(): Promise<DeployResultJson> {
    return { ...this.result.response, files: this.result.getFileResponses() ?? [] };
  }

  public display(): void {
    if (this.result.response.status === RequestStatus.Canceled) {
      ux.log(`Successfully canceled ${this.result.response.id}`);
    } else {
      ux.error(`Could not cancel ${this.result.response.id}`);
    }
  }
}
