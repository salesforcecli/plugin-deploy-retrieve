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
import * as path from 'node:path';
import { homedir } from 'node:os';
import * as fs from 'node:fs';
import { ComponentSet, RegistryAccess } from '@salesforce/source-deploy-retrieve';
import { Global } from '@salesforce/core';
import { isNonDecomposedCustomLabels } from './metadataTypes.js';

const MANIFEST_CACHE_DIR = 'manifestCache';

/** Give it a jobId, ComponentSet it will write the manifest file
 * returns the file path it wrote to */
export const writeManifest = async (
  jobId: string,
  componentSet: ComponentSet,
  registry: RegistryAccess
): Promise<string> => {
  const types = new Set((await componentSet.getObject()).Package.types.map((t) => t.name));
  // when we write a manifest, we will omit the CustomLabels component since it's redundant with the individual labels.
  // this makes the use of the manifest in report/resume/etc accurate in certain mpd scenarios where it would otherwise pull in ALL labels from every dir
  // regardless of whether they were actually deployed
  // we'll only do this when something like `-m CustomLabels:*` or `-d labels/CustomLabels.labels-meta.xml` is specified which will include every CustomLabel
  // in the project. When only a single label is specified, we need to strip out the `CustomLabels` entry otherwise we'll display information for every
  // CustomLabel in the project instead of the single on specified

  let xml: string;
  if (types.has('CustomLabels') && types.has('CustomLabel')) {
    // cs.filter doesn't return the SAME component set, it just returns a new one...
    // and so when we set anything on the component set that was passed in, it won't be set on the filtered one
    // so, we create a new CS, and set the values from the original

    const cs = new ComponentSet(
      componentSet.filter((c) => !isNonDecomposedCustomLabels(c)),
      registry
    );

    cs.sourceApiVersion = componentSet.sourceApiVersion;
    cs.apiVersion = componentSet.apiVersion;
    cs.projectDirectory = componentSet.projectDirectory;

    xml = await cs.getPackageXml();
  } else {
    xml = await componentSet.getPackageXml();
  }
  const filePath = getManifestFilePath(jobId);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, xml);
  return filePath;
};

export const maybeDestroyManifest = async (jobId: string): Promise<void> => {
  try {
    return await fs.promises.rm(getManifestFilePath(jobId));
  } catch (e) {
    // that's ok in a maybe
  }
};

const getManifestFilePath = (jobId: string): string =>
  path.join(homedir(), Global.SF_STATE_FOLDER, MANIFEST_CACHE_DIR, `${jobId}.xml`);
