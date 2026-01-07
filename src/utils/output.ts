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
import ansis from 'ansis';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { FileResponse, FileResponseFailure, FileResponseSuccess } from '@salesforce/source-deploy-retrieve';

export function tableHeader(message: string): string {
  return ansis.blue.bold(message);
}

export const makePathRelative = <T extends FileResponse | FileResponseSuccess | FileResponseFailure>(fr: T): T =>
  fr.filePath ? { ...fr, filePath: path.relative(process.cwd(), fr.filePath) } : fr;
/**
 * Sorts file responds by type, then by filePath, then by fullName
 */
export const fileResponseSortFn = (i: FileResponse, j: FileResponse): number => {
  if (i.type === j.type && i.filePath && j.filePath) {
    if (i.filePath === j.filePath) {
      return i.fullName > j.fullName ? 1 : -1;
    }
    return i?.filePath > j?.filePath ? 1 : -1;
  }
  return i.type > j.type ? 1 : -1;
};

export const exitCodeAsNumber = (): number | undefined => {
  try {
    return typeof process.exitCode === 'string' ? parseInt(process.exitCode, 10) : process.exitCode ?? undefined;
  } catch {
    // it *could* be a string that fails to parse to int?
    return undefined;
  }
};

export const getZipFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  while (bytes > 1024 && units.length) {
    bytes /= 1024;
    units.shift();
  }
  return parseFloat(bytes.toFixed(2)) + ' ' + units[0];
};

/** oclif table doesn't like "interface" but likes "type".  SDR exports an interface  */
export const getFileResponseSuccessProps = (
  s: FileResponseSuccess
): Pick<FileResponseSuccess, 'filePath' | 'fullName' | 'state' | 'type'> => ({
  filePath: s.filePath,
  fullName: s.fullName,
  type: s.type,
  state: s.state,
});

export function error(message: string): string {
  return StandardColors.error(message);
}

export function success(message: string): string {
  return StandardColors.success(message);
}

export const check = StandardColors.success('✓');
