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
const mdTransferMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'metadata.transfer');

const showBar = Boolean(
  process.env.TERM !== 'dumb' && process.stdin.isTTY && env.getBoolean(EnvironmentVariable.SF_USE_PROGRESS_BAR, true)
);

export class DeployProgress extends Progress {
  private static OPTIONS = {
    title: 'Status',
    format: `%s: {status} ${showBar ? '| {bar} ' : ''}| {value}/{total} Components (Errors:{errorCount}) {testInfo}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    linewrap: true,
    // people really like to get text output in CI systems
    // they won't get the "bar" but will get the remaining template bits this way
    noTTYOutput: true,
  };

  public constructor(private deploy: MetadataApiDeploy, jsonEnabled = false) {
    super(!jsonEnabled);
  }

  public start(): void {
    super.start(0, { status: 'Waiting' }, DeployProgress.OPTIONS);

    this.deploy.onUpdate((data) => this.updateProgress(data));

    // any thing else should make one final update, then stop the progress bar
    this.deploy.onFinish((data) => {
      this.updateProgress(data.response);
      this.finish({ status: mdTransferMessages.getMessage(data.response.status) });
    });

    this.deploy.onCancel(() => this.stop());

    this.deploy.onError((error: Error) => {
      this.stop();
      throw error;
    });
  }

  private updateProgress(data: MetadataApiDeployStatus): void {
    // the numCompTot. isn't computed right away, wait to start until we know how many we have
    const errorCount = data.numberComponentErrors ?? 0;
    const testInfo = `| ${data.numberTestsCompleted ?? 0}/${data.numberTestsTotal ?? 0} Tests (Errors:${
      data.numberTestErrors
    })`;
    if (data.numberComponentsTotal) {
      this.setTotal(data.numberComponentsTotal);
      this.update(data.numberComponentsDeployed, {
        errorCount,
        status: mdTransferMessages.getMessage(data.status),
        testInfo,
      });
    } else {
      this.update(0, { errorCount, testInfo, status: mdTransferMessages.getMessage(data.status) ?? 'Waiting' });
    }
  }
}
