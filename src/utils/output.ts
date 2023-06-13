/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { blue, bold } from 'chalk';
import { StandardColors } from '@salesforce/sf-plugins-core';
import {
  FileResponse,
  FileResponseFailure,
  FileResponseSuccess,
  Failures,
  Successes,
} from '@salesforce/source-deploy-retrieve';

export function tableHeader(message: string): string {
  return blue(bold(message));
}

export function asRelativePaths<T extends FileResponse | FileResponseSuccess | FileResponseFailure>(
  fileResponses: T[]
): T[] {
  const relative = fileResponses.map((file) =>
    file.filePath ? { ...file, filePath: path.relative(process.cwd(), file.filePath) } : file
  );

  return relative;
}
/**
 * Sorts file responds by type, then by filePath, then by fullName
 */
export function sortFileResponses<T extends FileResponse | FileResponseSuccess | FileResponseFailure>(
  fileResponses: T[]
): T[] {
  return fileResponses.sort((i, j) => {
    if (i.type === j.type && i.filePath && j.filePath) {
      if (i.filePath === j.filePath) {
        return i.fullName > j.fullName ? 1 : -1;
      }
      return i?.filePath > j?.filePath ? 1 : -1;
    }
    return i.type > j.type ? 1 : -1;
  });
}

export const getFileResponseSuccessProps = (
  successes: FileResponseSuccess[]
): Array<Pick<FileResponseSuccess, 'filePath' | 'fullName' | 'state' | 'type'>> =>
  successes.map((s) => ({ filePath: s.filePath, fullName: s.fullName, type: s.type, state: s.state }));

export function sortTestResults<T extends Failures | Successes>(results: T[]): T[] {
  return results.sort((a, b) => {
    if (a.methodName === b.methodName) {
      return a.name.localeCompare(b.name);
    }
    return a.methodName.localeCompare(b.methodName);
  });
}

export function error(message: string): string {
  return StandardColors.error(bold(message));
}

export function success(message: string): string {
  return StandardColors.success(bold(message));
}

export const check = StandardColors.success('✓');
