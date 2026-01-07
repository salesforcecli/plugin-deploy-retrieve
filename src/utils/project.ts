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

import { SfProject } from '@salesforce/core';
import { Optional } from '@salesforce/ts-types';

export async function getPackageDirs(): Promise<string[]> {
  const project = await SfProject.resolve();
  return project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
}

export async function getSourceApiVersion(): Promise<Optional<string>> {
  const project = await SfProject.resolve();
  const projectConfig = await project.resolveProjectConfig();
  return projectConfig.sourceApiVersion as Optional<string>;
}

export async function getOptionalProject(): Promise<SfProject | undefined> {
  try {
    return await SfProject.resolve();
  } catch (e) {
    return undefined;
  }
}
