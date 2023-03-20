/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { homedir } from 'os';
import * as fs from 'fs';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { Global } from '@salesforce/core';

const MANIFEST_CACHE_DIR = 'manifestCache';

/** Give it a jobId, ComponentSet it will write the manifest file
 * returns the file path it wrote to */
export const writeManifest = async (jobId: string, componentSet: ComponentSet): Promise<string> => {
  // when we write a manifest, we will omit the CustomLabels component since it's redundant with the individual labels.
  // this makes the use of the manifest in report/resume/etc accurate in certain mpd scenarios where it would otherwise pull in ALL labels from every dir
  // regardless of whether they were actually deployed
  const xml = await componentSet.filter((c) => c.type.name !== 'CustomLabels').getPackageXml();
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
