/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfProject } from '@salesforce/core';
import { Nullable } from '@salesforce/ts-types';

export async function getPackageDirs(): Promise<string[]> {
  const project = await SfProject.resolve();
  return project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
}

export async function getSourceApiVersion(): Promise<Nullable<string>> {
  const project = await SfProject.resolve();
  const projectConfig = await project.resolveProjectConfig();
  return projectConfig.sourceApiVersion as Nullable<string>;
}
