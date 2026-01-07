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
import os from 'node:os';
import { MultiStageOutput } from '@oclif/multi-stage-output';
import { Lifecycle, Messages } from '@salesforce/core';
import {
  Failures,
  MetadataApiDeploy,
  MetadataApiDeployStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';
import { SourceMemberPollingEvent } from '@salesforce/source-tracking';
import terminalLink from 'terminal-link';
import ansis from 'ansis';
import { testResultSort } from '../formatters/testResultsFormatter.js';
import { getZipFileSize } from './output.js';
import { isTruthy } from './types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const mdTransferMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'metadata.transfer');

type Options = {
  title: string;
  jsonEnabled: boolean;
};

type Data = {
  mdapiDeploy: MetadataApiDeployStatus;
  sourceMemberPolling: SourceMemberPollingEvent;
  status: string;
  message: string;
  username: string;
  id: string;
  deploySize: number;
  deployFileCount: number;
  deployUrl: string;
  verbose: boolean;
};

function round(value: number, precision: number): number {
  const multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

function formatProgress(current: number, total: number): string {
  if (total === 0) {
    return '0/0 (0%)';
  }

  return `${current}/${total} (${round((current / total) * 100, 0)}%)`;
}

export class DeployStages {
  private mso: MultiStageOutput<Data>;
  /**
   * Set of Apex test failures that were already rendered in the `Running Tests` block.
   * This is used in the `Failed` stage block for CI output to ensure test failures aren't duplicated when rendering new failures on polling.
   */
  private printedApexTestFailures: Set<string>;

  public constructor({ title, jsonEnabled }: Options) {
    this.printedApexTestFailures = new Set();
    this.mso = new MultiStageOutput<Data>({
      title,
      stages: [
        'Preparing',
        'Waiting for the org to respond',
        'Deploying Metadata',
        'Running Tests',
        'Updating Source Tracking',
        'Done',
      ],
      jsonEnabled,
      preStagesBlock: [
        {
          type: 'message',
          get: (data): string | undefined => data?.message,
        },
      ],
      postStagesBlock: [
        {
          label: 'Status',
          get: (data): string | undefined => {
            if (!terminalLink.isSupported) return data?.status;
            if (!data?.deployUrl) return data?.status;

            return data?.status
              ? terminalLink(data.status, data.deployUrl, {
                  fallback: (text, url) => `${text} (${url})`,
                })
              : undefined;
          },
          bold: true,
          type: 'dynamic-key-value',
          onlyShowAtEndInCI: true,
        },
        {
          label: 'Deploy ID',
          get: (data): string | undefined => data?.id,
          type: 'static-key-value',
          neverCollapse: true,
        },
        {
          label: 'Target Org',
          get: (data): string | undefined => data?.username,
          type: 'static-key-value',
        },
        {
          label: 'Deploy URL',
          get: (data): string | undefined => {
            if (!data?.verbose) return;
            return data?.deployUrl;
          },
          type: 'static-key-value',
        },
        {
          label: 'Size',
          get: (data): string | undefined =>
            data?.deploySize && data?.verbose ? `${getZipFileSize(data.deploySize)} of ~39 MB limit` : undefined,
          type: 'static-key-value',
        },
        {
          label: 'Files',
          get: (data): string | undefined =>
            data?.deployFileCount && data?.verbose ? `${data.deployFileCount} of 10,000 limit` : undefined,
          type: 'static-key-value',
        },
      ],
      stageSpecificBlock: [
        {
          label: 'Components',
          get: (data): string | undefined =>
            data?.mdapiDeploy?.numberComponentsTotal
              ? formatProgress(
                  data?.mdapiDeploy?.numberComponentsDeployed ?? 0,
                  data?.mdapiDeploy?.numberComponentsTotal
                )
              : undefined,
          stage: 'Deploying Metadata',
          type: 'dynamic-key-value',
        },
        {
          label: 'Successful',
          get: (data): string | undefined =>
            data?.mdapiDeploy?.numberTestsTotal && data?.mdapiDeploy?.numberTestsCompleted
              ? formatProgress(data?.mdapiDeploy?.numberTestsCompleted, data?.mdapiDeploy?.numberTestsTotal)
              : undefined,
          stage: 'Running Tests',
          type: 'dynamic-key-value',
        },
        {
          label: 'Failed',
          alwaysPrintInCI: true,
          get: (data): string | undefined => {
            let testFailures: Failures[] = [];

            // only render new test failures
            if (isCI() && Array.isArray(data?.mdapiDeploy.details.runTestResult?.failures)) {
              // skip failure counter/progress info if there's no new failures to render.
              if (
                this.printedApexTestFailures.size > 0 &&
                data.mdapiDeploy.numberTestErrors === this.printedApexTestFailures.size
              ) {
                return undefined;
              }

              testFailures = data.mdapiDeploy.details.runTestResult?.failures.filter(
                (f) => !this.printedApexTestFailures.has(`${f.name}.${f.methodName}`)
              );

              data?.mdapiDeploy.details.runTestResult?.failures.forEach((f) =>
                this.printedApexTestFailures.add(`${f.name}.${f.methodName}`)
              );

              return data?.mdapiDeploy?.numberTestsTotal && data?.mdapiDeploy?.numberTestErrors
                ? formatProgress(data?.mdapiDeploy?.numberTestErrors, data?.mdapiDeploy?.numberTestsTotal) +
                    (isCI() ? os.EOL + formatTestFailures(testFailures) : '')
                : undefined;
            }

            return data?.mdapiDeploy?.numberTestsTotal && data?.mdapiDeploy?.numberTestErrors
              ? formatProgress(data?.mdapiDeploy?.numberTestErrors, data?.mdapiDeploy?.numberTestsTotal)
              : undefined;
          },
          stage: 'Running Tests',
          type: 'dynamic-key-value',
        },
        {
          label: 'Members',
          get: (data): string | undefined =>
            data?.sourceMemberPolling?.original
              ? formatProgress(
                  data.sourceMemberPolling.original - data.sourceMemberPolling.remaining,
                  data.sourceMemberPolling.original
                )
              : undefined,
          stage: 'Updating Source Tracking',
          type: 'dynamic-key-value',
        },
      ],
    });
  }

  public start(
    { username, deploy }: { username?: string | undefined; deploy: MetadataApiDeploy },
    initialData?: Partial<Data>
  ): void {
    const lifecycle = Lifecycle.getInstance();
    if (initialData) this.mso.updateData(initialData);
    this.mso.skipTo('Preparing', { username, id: deploy.id });

    // for sourceMember polling events
    lifecycle.on<SourceMemberPollingEvent>('sourceMemberPollingEvent', (event: SourceMemberPollingEvent) => {
      if (event.original > 0) {
        return Promise.resolve(this.mso.skipTo('Updating Source Tracking', { sourceMemberPolling: event }));
      }

      return Promise.resolve();
    });

    deploy.onUpdate((data) => {
      if (
        data.numberComponentsDeployed === data.numberComponentsTotal &&
        data.numberTestsTotal > 0 &&
        data.numberComponentsDeployed > 0
      ) {
        this.mso.skipTo('Running Tests', { mdapiDeploy: data, status: mdTransferMessages.getMessage(data?.status) });
      } else if (data.status === RequestStatus.Pending) {
        this.mso.skipTo('Waiting for the org to respond', {
          mdapiDeploy: data,
          status: mdTransferMessages.getMessage(data?.status),
        });
      } else {
        this.mso.skipTo('Deploying Metadata', {
          mdapiDeploy: data,
          status: mdTransferMessages.getMessage(data?.status),
        });
      }
    });

    deploy.onFinish((data) => {
      this.mso.updateData({ mdapiDeploy: data.response, status: mdTransferMessages.getMessage(data.response.status) });
      if (data.response.status === RequestStatus.Failed) {
        this.mso.error();
      } else {
        this.mso.skipTo('Done');
        this.mso.stop();
      }
    });

    deploy.onCancel((data) => {
      this.mso.updateData({ mdapiDeploy: data, status: mdTransferMessages.getMessage(data?.status ?? 'Canceled') });

      this.mso.error();
    });

    deploy.onError((error: Error) => {
      if (error.message.includes('client has timed out')) {
        this.mso.updateData({ status: 'Client Timeout' });
      }

      this.mso.error();
      throw error;
    });
  }

  public update(data: Partial<Data>): void {
    this.mso.updateData(data);
  }

  public stop(): void {
    this.mso.stop();
  }

  public error(): void {
    this.mso.error();
  }

  public done(data?: Partial<Data>): void {
    this.mso.skipTo('Done', data);
  }
}

function formatTestFailures(failuresData: Failures[]): string {
  const failures = failuresData.sort(testResultSort);

  let output = '';

  for (const test of failures) {
    const testName = ansis.underline(`${test.name}.${test.methodName}`);
    output += `   • ${testName}${os.EOL}`;
    output += `     message: ${test.message}${os.EOL}`;
    if (test.stackTrace) {
      const stackTrace = test.stackTrace.replace(/\n/g, `${os.EOL}    `);
      output += `     stacktrace:${os.EOL}       ${stackTrace}${os.EOL}${os.EOL}`;
    }
  }

  // remove last EOL char
  return output.slice(0, -1);
}

export function isCI(): boolean {
  if (
    isTruthy(process.env.CI) &&
    ('CI' in process.env ||
      'CONTINUOUS_INTEGRATION' in process.env ||
      Object.keys(process.env).some((key) => key.startsWith('CI_')))
  )
    return true;

  return false;
}
