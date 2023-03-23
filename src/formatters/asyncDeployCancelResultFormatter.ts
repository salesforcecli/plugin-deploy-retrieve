/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ux } from '@oclif/core';
import { Messages } from '@salesforce/core';
import { AsyncDeployResultJson, DeployResultJson, Formatter } from '../utils/types';

Messages.importMessagesDirectory(__dirname);

export const deployAsyncMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.async');

export class AsyncDeployCancelResultFormatter implements Formatter<AsyncDeployResultJson> {
  public constructor(private id: string) {}

  public getJson(): DeployResultJson {
    return { id: this.id, done: false, status: 'Queued', files: [] };
  }

  public display(): void {
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployCancelQueued'));
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployResume', [this.id]));
    ux.log(deployAsyncMessages.getMessage('info.AsyncDeployStatus', [this.id]));
  }
}
