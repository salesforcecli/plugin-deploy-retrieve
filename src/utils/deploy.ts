/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Interfaces, Flags } from '@oclif/core';
import { ConfigAggregator, Global, Org, SfdxPropertyKeys, TTLConfig } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { ComponentSet, ComponentSetBuilder, DeployResult, MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { JsonMap } from '@salesforce/ts-types';
import { getPackageDirs, getSourceApiVersion } from './project';
import { API, TestLevel, TestResults } from './types';

type Options = {
  api: API;
  'target-org': Org | string;
  'test-level': TestLevel;
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
};

type CachedOptions = Omit<Options, 'wait' | 'target-org'> & { 'target-org': string; wait: number } & JsonMap;

export function resolveRestDeploy(): API {
  const restDeployConfig = ConfigAggregator.getValue(SfdxPropertyKeys.REST_DEPLOY).value;

  if (restDeployConfig === 'false') {
    return API.SOAP;
  } else if (restDeployConfig === 'true') {
    return API.REST;
  } else {
    return API.SOAP;
  }
}

export async function executeDeploy(
  opts: Partial<Options>
): Promise<{ deploy: MetadataApiDeploy; componentSet: ComponentSet }> {
  const componentSet = await ComponentSetBuilder.build({
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

  const targetOrg = typeof opts['target-org'] === 'string' ? opts['target-org'] : opts['target-org'].getUsername();
  const deploy = await componentSet.deploy({
    usernameOrConnection: targetOrg,
    apiOptions: {
      checkOnly: opts['dry-run'] || false,
      ignoreWarnings: opts['ignore-warnings'] || false,
      rest: opts.api === API.REST,
      rollbackOnError: !opts['ignore-errors'] || false,
      runTests: opts.tests || [],
      testLevel: opts['test-level'],
    },
  });

  const cache = await DeployCache.create();
  cache.set(deploy.id, { ...opts, 'target-org': targetOrg, wait: opts.wait.quantity });
  await cache.write();
  return { deploy, componentSet };
}

export const apiFlag = (opts: Partial<Interfaces.OptionFlag<API>> = {}): Interfaces.OptionFlag<API> => {
  return Flags.build<API>({
    options: Object.values(API),
    helpValue: `<${Object.values(API).join('|')}>`,
    defaultHelp: async (): Promise<API> => Promise.resolve(resolveRestDeploy()),
    default: async (): Promise<API> => Promise.resolve(resolveRestDeploy()),
    parse: (input: string) => Promise.resolve(input as API),
    ...opts,
  })();
};

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

export function getTestResults(result: DeployResult): TestResults {
  const passing = result.response.numberTestsCompleted ?? 0;
  const failing = result.response.numberTestErrors ?? 0;
  const total = result.response.numberTestsTotal ?? 0;
  const testResults = { passing, failing, total };
  const time = result.response.details.runTestResult.totalTime;
  return time ? { ...testResults, time } : testResults;
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
      ttl: Duration.days(1),
    };
  }

  public static async unset(key: string): Promise<void> {
    const cache = await DeployCache.create();
    cache.unset(key);
    await cache.write();
  }
}
