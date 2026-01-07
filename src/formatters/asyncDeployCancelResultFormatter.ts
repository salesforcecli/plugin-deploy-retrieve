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

import { Ux } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { AsyncDeployResultJson, DeployResultJson, Formatter } from '../utils/types.js';

const ux = new Ux();

export class AsyncDeployCancelResultFormatter implements Formatter<AsyncDeployResultJson> {
  public constructor(private id: string) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getJson(): Promise<DeployResultJson> {
    return { id: this.id, done: false, status: 'Queued', files: [] };
  }

  public display(): void {
    Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
    const deployAsyncMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.async');

    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployCancelQueued'));
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployResume', [this.id]));
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployStatus', [this.id]));
  }
}
