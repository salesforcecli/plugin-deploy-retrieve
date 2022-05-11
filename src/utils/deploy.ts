/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConfigAggregator, Global, Messages, Org, PollingClient, StatusResult, TTLConfig } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson, JsonMap, Nullable } from '@salesforce/ts-types';
import {
  ComponentSet,
  ComponentSetBuilder,
  DeployResult,
  MetadataApiDeploy,
  MetadataApiDeployStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';
import ConfigMeta, { ConfigVars } from '../configMeta';
import { getPackageDirs, getSourceApiVersion } from './project';
import { API, PathInfo, TestLevel } from './types';
import { DEPLOY_STATUS_CODES } from './errorCodes';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'cache');

export type DeployOptions = {
  api: API;
  'target-org': string;
  'test-level': TestLevel;
  async?: boolean;
  'api-version'?: string;
  'dry-run'?: boolean;
  'ignore-errors'?: boolean;
  'ignore-warnings'?: boolean;
  manifest?: string;
  metadata?: string[];
  'metadata-dir'?: PathInfo;
  'source-dir'?: string[];
  tests?: string[];
  wait?: Duration;
  verbose?: boolean;
  concise?: boolean;
  'single-package'?: boolean;
  status?: RequestStatus;
};

export type CachedOptions = Omit<DeployOptions, 'wait'> & { wait: number };

export function validateTests(testLevel: TestLevel, tests: Nullable<string[]>): boolean {
  if (testLevel === TestLevel.RunSpecifiedTests && (tests ?? []).length === 0) return false;
  return true;
}

export async function resolveApi(): Promise<API> {
  const agg = await ConfigAggregator.create({ customConfigMeta: ConfigMeta });
  const restDeployConfig = agg.getInfo(ConfigVars.ORG_METADATA_REST_DEPLOY)?.value;
  return restDeployConfig === 'true' ? API.REST : API.SOAP;
}

export async function buildComponentSet(opts: Partial<DeployOptions>): Promise<ComponentSet> {
  if (!opts['source-dir'] && !opts.manifest && !opts.metadata) return new ComponentSet();

  return ComponentSetBuilder.build({
    apiversion: opts['api-version'],
    sourceapiversion: await getSourceApiVersion(),
    sourcepath: opts['source-dir'],
    manifest: opts.manifest && {
      manifestPath: opts.manifest,
      directoryPaths: await getPackageDirs(),
    },
    metadata: opts.metadata && {
      metadataEntries: opts.metadata,
      directoryPaths: await getPackageDirs(),
    },
  });
}

export async function executeDeploy(
  opts: Partial<DeployOptions>,
  id?: string
): Promise<{ deploy: MetadataApiDeploy; componentSet: ComponentSet }> {
  const apiOptions = {
    checkOnly: opts['dry-run'] || false,
    ignoreWarnings: opts['ignore-warnings'] || false,
    rest: opts.api === API.REST,
    rollbackOnError: !opts['ignore-errors'] || false,
    runTests: opts.tests || [],
    testLevel: opts['test-level'],
  };

  let deploy: MetadataApiDeploy;
  let componentSet: ComponentSet;

  if (opts['metadata-dir']) {
    if (id) {
      deploy = new MetadataApiDeploy({ id, usernameOrConnection: opts['target-org'] });
    } else {
      const key = opts['metadata-dir'].type === 'directory' ? 'mdapiPath' : 'zipPath';
      deploy = new MetadataApiDeploy({
        [key]: opts['metadata-dir'].path,
        usernameOrConnection: opts['target-org'],
        apiOptions: { ...apiOptions, singlePackage: opts['single-package'] || false },
      });
      await deploy.start();
    }
  } else {
    componentSet = await buildComponentSet(opts);
    deploy = id
      ? new MetadataApiDeploy({ id, usernameOrConnection: opts['target-org'], components: componentSet })
      : await componentSet.deploy({
          usernameOrConnection: opts['target-org'],
          apiOptions,
        });
  }

  await DeployCache.set(deploy.id, { ...opts, wait: opts.wait?.minutes ?? 33 });
  return { deploy, componentSet };
}

export async function cancelDeploy(opts: Partial<DeployOptions>, id: string): Promise<DeployResult> {
  const org = await Org.create({ aliasOrUsername: opts['target-org'] });
  const deploy = new MetadataApiDeploy({ usernameOrConnection: org.getUsername(), id });
  const componentSet = await buildComponentSet({ ...opts });

  await DeployCache.set(deploy.id, { ...opts, wait: opts.wait?.minutes ?? 33 });

  await deploy.cancel();
  return poll(org, deploy.id, opts.wait, componentSet);
}

export async function cancelDeployAsync(opts: Partial<DeployOptions>, id: string): Promise<{ id: string }> {
  const org = await Org.create({ aliasOrUsername: opts['target-org'] });
  const deploy = new MetadataApiDeploy({ usernameOrConnection: org.getUsername(), id });
  await deploy.cancel();
  return { id: deploy.id };
}

export async function poll(org: Org, id: string, wait: Duration, componentSet: ComponentSet): Promise<DeployResult> {
  const report = async (): Promise<DeployResult> => {
    const res = await org.getConnection().metadata.checkDeployStatus(id, true);
    const deployStatus = res as unknown as MetadataApiDeployStatus;
    return new DeployResult(deployStatus as unknown as MetadataApiDeployStatus, componentSet);
  };

  const opts: PollingClient.Options = {
    frequency: Duration.milliseconds(1000),
    timeout: wait,
    poll: async (): Promise<StatusResult> => {
      const deployResult = await report();
      return {
        completed: deployResult.response.done,
        payload: deployResult as unknown as AnyJson,
      };
    },
  };
  const pollingClient = await PollingClient.create(opts);
  return pollingClient.subscribe() as unknown as Promise<DeployResult>;
}

export function determineExitCode(result: DeployResult, async = false): number {
  if (async) {
    return result.response.status === RequestStatus.Succeeded ? 0 : 1;
  }

  return DEPLOY_STATUS_CODES.get(result.response.status);
}

export function isNotResumable(status: RequestStatus): boolean {
  return [
    RequestStatus.Succeeded,
    RequestStatus.Failed,
    RequestStatus.SucceededPartial,
    RequestStatus.Canceled,
  ].includes(status);
}

export class DeployCache extends TTLConfig<TTLConfig.Options, CachedOptions> {
  public static getFileName(): string {
    return 'deploy-cache.json';
  }

  public static getDefaultOptions(): TTLConfig.Options {
    return {
      isGlobal: false,
      isState: true,
      filename: DeployCache.getFileName(),
      stateFolder: Global.SF_STATE_FOLDER,
      ttl: Duration.days(3),
    };
  }

  public static async set(key: string, value: Partial<CachedOptions>): Promise<void> {
    const cache = await DeployCache.create();
    cache.set(key, value);
    await cache.write();
  }

  public static async unset(key: string): Promise<void> {
    const cache = await DeployCache.create();
    cache.unset(key);
    await cache.write();
  }

  public static async update(key: string, obj: JsonMap): Promise<void> {
    const cache = await DeployCache.create();
    cache.update(key, obj);
    await cache.write();
  }

  public resolveLatest(useMostRecent: boolean, key: Nullable<string>, throwOnNotFound = true): string {
    const jobId = this.resolveLongId(useMostRecent ? this.getLatestKey() : key);
    if (!jobId && useMostRecent) throw messages.createError('error.NoRecentJobId');

    if (throwOnNotFound && !this.has(jobId)) {
      throw messages.createError('error.InvalidJobId', [jobId]);
    }

    return jobId;
  }

  public resolveLongId(jobId: string): string {
    if (jobId.length === 18) {
      return jobId;
    } else if (jobId.length === 15) {
      return this.keys().find((k) => k.substring(0, 15) === jobId);
    } else {
      throw messages.createError('error.InvalidJobId', [jobId]);
    }
  }

  public get(jobId: string): TTLConfig.Entry<CachedOptions> {
    return super.get(this.resolveLongId(jobId));
  }
}
