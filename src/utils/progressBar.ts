/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { envVars as env, EnvironmentVariable, Lifecycle, Messages } from '@salesforce/core';
import { MetadataApiDeploy, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { Progress } from '@salesforce/sf-plugins-core';
import { SourceMemberPollingEvent } from '@salesforce/source-tracking';
import { ux } from '@oclif/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const mdTransferMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'metadata.transfer');

const showBar = Boolean(
  process.env.TERM !== 'dumb' && process.stdin.isTTY && env.getBoolean(EnvironmentVariable.SF_USE_PROGRESS_BAR, true)
);

export class DeployProgress extends Progress {
  private static OPTIONS = {
    title: 'Status',
    format: `%s: {status} ${showBar ? '| {bar} ' : ''}| {value}/{total} Components{errorInfo}{testInfo}{trackingInfo}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    linewrap: true,
    // people really like to get text output in CI systems
    // they won't get the "bar" but will get the remaining template bits this way
    noTTYOutput: true,
  };
  private lifecycle = Lifecycle.getInstance();

  public constructor(private deploy: MetadataApiDeploy, jsonEnabled = false) {
    super(!jsonEnabled);
  }

  public start(): void {
    super.start(0, { status: 'Waiting', trackingInfo: '', testInfo: '' }, DeployProgress.OPTIONS);

    // for sourceMember polling events
    this.lifecycle.on<SourceMemberPollingEvent>('sourceMemberPollingEvent', (event: SourceMemberPollingEvent) =>
      Promise.resolve(this.updateTrackingProgress(event))
    );

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

  private updateTrackingProgress(data: SourceMemberPollingEvent): void {
    const { remaining, original } = data;
    this.update(0, {
      status: 'Polling SourceMembers',
      trackingInfo: ` | Tracking: ${original - remaining}/${original}`,
    });
  }

  private updateProgress(data: MetadataApiDeployStatus): void {
    // the numCompTot. isn't computed right away, wait to start until we know how many we have
    const testInfo = data.numberTestsTotal
      ? ` | ${data.numberTestsCompleted ?? 0}/${data.numberTestsTotal ?? 0} Tests${
          data.numberTestErrors ? `(Errors:${data.numberTestErrors})` : ''
        }`
      : '';
    const errorInfo = data.numberComponentErrors > 0 ? ` | Errors: ${data.numberComponentErrors}` : '';

    if (data.numberComponentsTotal) {
      this.setTotal(data.numberComponentsTotal);
      this.update(data.numberComponentsDeployed, {
        errorInfo: data.numberComponentErrors > 0 ? ` | Errors: ${data.numberComponentErrors}` : '',
        status: mdTransferMessages.getMessage(data.status),
        testInfo,
      });
    } else {
      ux.debug(`Deploy Progress Status (else): ${data.status}`);
      let status;
      try {
        status = mdTransferMessages.getMessage(data.status);
      } catch (e) {
        ux.debug(`data.status message lookup failed for: ${data.status}`);
        status = 'Waiting';
      }
      this.update(0, { errorInfo, testInfo, status });
    }
  }
}
