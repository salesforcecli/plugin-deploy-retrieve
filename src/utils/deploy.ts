/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Interfaces, Flags } from '@oclif/core';
import { ConfigAggregator, SfdxPropertyKeys } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { ComponentSet, ComponentSetBuilder, DeployResult, MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { getPackageDirs, getSourceApiVersion } from './project';
import { API, TestLevel, TestResults } from './types';

type Options = {
  api: API;
  'target-org': string;
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

  const deploy = await componentSet.deploy({
    usernameOrConnection: opts['target-org'],
    apiOptions: {
      checkOnly: opts['dry-run'] || false,
      ignoreWarnings: opts['ignore-warnings'] || false,
      rest: opts.api === API.REST,
      rollbackOnError: !opts['ignore-errors'] || false,
      runTests: opts.tests || [],
      testLevel: opts['test-level'],
    },
  });

  return { deploy, componentSet };
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

export function getTestResults(result: DeployResult): TestResults {
  const passing = result.response.numberTestsCompleted ?? 0;
  const failing = result.response.numberTestErrors ?? 0;
  const total = result.response.numberTestsTotal ?? 0;
  const testResults = { passing, failing, total };
  const time = result.response.details.runTestResult.totalTime;
  return time ? { ...testResults, time } : testResults;
}
