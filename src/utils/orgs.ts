/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConfigAggregator, GlobalInfo, OrgConfigProperties, SfError, SfProject } from '@salesforce/core';
import { AnyJson, Nullable, getString } from '@salesforce/ts-types';

export const resolveTargetOrg = async (targetOrg: Nullable<string>): Promise<string> => {
  const configuredTargetOrg = getConfigValue<string>(OrgConfigProperties.TARGET_ORG);
  const aliasOrUsername = targetOrg || configuredTargetOrg;

  if (!aliasOrUsername) {
    throw new SfError('no target environment specified', 'NoTargetEnv', [
      'specify target environment with the --target-org flag',
      'set the default environment with "sf config set target-org"',
    ]);
  }
  return (await GlobalInfo.getInstance()).aliases.resolveUsername(aliasOrUsername);
};

export const getPackageDirs = async (): Promise<string[]> => {
  const project = await SfProject.resolve();
  return project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
};

const getConfigValue = <T extends AnyJson>(key: string): T => {
  return ConfigAggregator.getValue(key)?.value as T;
};

export const getSourceApiVersion = async (): Promise<string> => {
  const project = await SfProject.resolve();
  const projectConfig = await project.resolveProjectConfig();
  return getString(projectConfig, 'sourceApiVersion');
};
