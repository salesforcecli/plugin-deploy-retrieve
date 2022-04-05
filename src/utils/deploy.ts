/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Interfaces, Flags } from '@oclif/core';
import { ConfigAggregator, Global, Org, PollingClient, StatusResult, TTLConfig } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson, Nullable } from '@salesforce/ts-types';
import {
  ComponentSet,
  ComponentSetBuilder,
  DeployResult,
  MetadataApiDeploy,
  MetadataApiDeployStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';
import { ConfigVars } from '../configMeta';
import { getPackageDirs, getSourceApiVersion } from './project';
import { API, TestLevel } from './types';
import { DEPLOY_STATUS_CODES } from './errorCodes';

type Options = {
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
  'source-dir'?: string[];
  tests?: string[];
  wait?: Duration;
  verbose?: boolean;
  concise?: boolean;
};

export type CachedOptions = Omit<Options, 'wait'> & { wait: number };

export function validateTests(testLevel: TestLevel, tests: Nullable<string[]>): boolean {
  if (testLevel === TestLevel.RunSpecifiedTests && (tests ?? []).length === 0) return false;
  return true;
}

export function resolveApi(): API {
  const restDeployConfig = ConfigAggregator.getValue(ConfigVars.ORG_METADATA_REST_DEPLOY)?.value;
  return restDeployConfig === 'true' ? API.REST : API.SOAP;
}

export async function buildComponentSet(opts: Partial<Options>): Promise<ComponentSet> {
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
  opts: Partial<Options>,
  id?: string
): Promise<{ deploy: MetadataApiDeploy; componentSet: ComponentSet }> {
  const componentSet = await buildComponentSet(opts);
  const deploy = await componentSet.deploy({
    usernameOrConnection: opts['target-org'],
    id,
    apiOptions: {
      checkOnly: opts['dry-run'] || false,
      ignoreWarnings: opts['ignore-warnings'] || false,
      rest: opts.api === API.REST,
      rollbackOnError: !opts['ignore-errors'] || false,
      runTests: opts.tests || [],
      testLevel: opts['test-level'],
    },
  });

  await DeployCache.set(deploy.id, { ...opts, wait: opts.wait?.minutes ?? 33 });
  return { deploy, componentSet };
}

export async function cancelDeploy(opts: Partial<Options>, id: string): Promise<DeployResult> {
  const org = await Org.create({ aliasOrUsername: opts['target-org'] });
  const deploy = new MetadataApiDeploy({ usernameOrConnection: org.getUsername(), id });
  const componentSet = await buildComponentSet({ ...opts });

  await DeployCache.set(deploy.id, { ...opts, wait: opts.wait?.minutes ?? 33 });

  await deploy.cancel();
  return poll(org, deploy.id, opts.wait, componentSet);
}

export async function poll(org: Org, id: string, wait: Duration, componentSet: ComponentSet): Promise<DeployResult> {
  const report = async (): Promise<DeployResult> => {
    const res = await org.getConnection().metadata.checkDeployStatus(id, true);
    const deployStatus = res as unknown as MetadataApiDeployStatus;
    return new DeployResult(deployStatus as unknown as MetadataApiDeployStatus, componentSet);
  };

  const opts: PollingClient.Options = {
    frequency: Duration.milliseconds(500),
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

export const testLevelFlag = (
  opts: Partial<Interfaces.OptionFlag<TestLevel | undefined>> = {}
): Interfaces.OptionFlag<TestLevel | undefined> => {
  return Flags.build<TestLevel | undefined>({
    char: 'l',
    parse: (input: string) => Promise.resolve(input as TestLevel),
    options: Object.values(TestLevel),
    ...opts,
  })();
};

export function determineExitCode(result: DeployResult, async = false): number {
  if (async) {
    return result.response.status === RequestStatus.Succeeded ? 0 : 1;
  }

  return DEPLOY_STATUS_CODES.get(result.response.status);
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
}
