/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfProject } from '@salesforce/core';
import { getString } from '@salesforce/ts-types';

export const getPackageDirs = async (): Promise<string[]> => {
  const project = await SfProject.resolve();
  return project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
};

export const getSourceApiVersion = async (): Promise<string> => {
  const project = await SfProject.resolve();
  const projectConfig = await project.resolveProjectConfig();
  return getString(projectConfig, 'sourceApiVersion');
};
