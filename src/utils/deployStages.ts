/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { MultiStageOutput } from '@oclif/multi-stage-output';
import { Lifecycle, Messages } from '@salesforce/core';
import { MetadataApiDeploy, MetadataApiDeployStatus, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SourceMemberPollingEvent } from '@salesforce/source-tracking';

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

  public constructor({ title, jsonEnabled }: Options) {
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
          get: (data): string | undefined => data?.status,
          bold: true,
          type: 'dynamic-key-value',
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
          label: 'Tests',
          get: (data): string | undefined =>
            data?.mdapiDeploy?.numberTestsTotal && data?.mdapiDeploy?.numberTestsCompleted
              ? formatProgress(data?.mdapiDeploy?.numberTestsCompleted, data?.mdapiDeploy?.numberTestsTotal)
              : undefined,
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
    this.mso.goto('Done', data);
  }
}
