/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { envVars as env, EnvironmentVariable } from '@salesforce/core';
import { MetadataApiDeploy, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { Messages } from '@salesforce/core';
import { Progress } from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectory(__dirname);
const mdTrasferMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'metadata.transfer');

export class DeployProgress extends Progress {
  private static OPTIONS = {
    title: 'Status',
    format: '%s: {status} | {bar} | {value}/{total} Components',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    linewrap: true,
  };

  public constructor(private deploy: MetadataApiDeploy, jsonEnabled = false) {
    super(!jsonEnabled && env.getBoolean(EnvironmentVariable.SF_USE_PROGRESS_BAR, true));
  }

  public start(): void {
    super.start(0, { status: 'Waiting' }, DeployProgress.OPTIONS);

    this.deploy.onUpdate((data) => this.updateProgress(data));

    // any thing else should make one final update, then stop the progress bar
    this.deploy.onFinish((data) => {
      this.updateProgress(data.response);
      this.finish({ status: mdTrasferMessages.getMessage(data.response.status) });
    });

    this.deploy.onCancel(() => this.stop());

    this.deploy.onError((error: Error) => {
      this.stop();
      throw error;
    });
  }

  private updateProgress(data: MetadataApiDeployStatus): void {
    // the numCompTot. isn't computed right away, wait to start until we know how many we have
    if (data.numberComponentsTotal) {
      this.setTotal(data.numberComponentsTotal + data.numberTestsTotal);
      this.update(data.numberComponentsDeployed + data.numberTestsCompleted, {
        status: mdTrasferMessages.getMessage(data.status),
      });
    } else {
      this.update(0, { status: mdTrasferMessages.getMessage(data.status) ?? 'Waiting' });
    }

    // the numTestsTot. isn't computed until validated as tests by the server, update the PB once we know
    if (data.numberTestsTotal && data.numberComponentsTotal) {
      this.setTotal(data.numberComponentsTotal + data.numberTestsTotal);
    }
  }
}
