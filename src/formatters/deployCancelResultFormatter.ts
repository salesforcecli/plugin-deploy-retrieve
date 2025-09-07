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
import { Ux } from '@salesforce/sf-plugins-core';
import { error } from '@oclif/core/ux';
import { DeployResult, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson, Formatter } from '../utils/types.js';

const ux = new Ux();

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
      error(`Could not cancel ${this.result.response.id}`);
    }
  }
}
