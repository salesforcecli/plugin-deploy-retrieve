/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'node:path';
import { homedir } from 'node:os';
import * as fs from 'node:fs';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { Global } from '@salesforce/core';

const MANIFEST_CACHE_DIR = 'manifestCache';

/** Give it a jobId, ComponentSet it will write the manifest file
 * returns the file path it wrote to */
export const writeManifest = async (jobId: string, componentSet: ComponentSet): Promise<string> => {
  const xml = await componentSet.getPackageXml();
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
