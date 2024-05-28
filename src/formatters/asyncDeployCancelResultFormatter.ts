/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ux } from '@oclif/core';
import { Messages } from '@salesforce/core';
import { AsyncDeployResultJson, DeployResultJson, Formatter } from '../utils/types.js';

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
