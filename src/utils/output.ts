/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { blue, bold } from 'chalk';
import {
  ComponentSet,
  FileResponse,
  FileResponseFailure,
  FileResponseSuccess,
} from '@salesforce/source-deploy-retrieve';
import { API } from './types';

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

export function getVersionMessage(action: string, componentSet: ComponentSet | undefined, api: API): string {
  // commands pass in the.componentSet, which may not exist in some tests or mdapi deploys
  if (!componentSet) {
    return `*** ${action} with ${api} ***`;
  }
  // neither
  if (!componentSet.sourceApiVersion && !componentSet.apiVersion) {
    return `*** ${action} with ${api} ***`;
  }
  // either OR both match (SDR will use either)
  if (
    !componentSet.sourceApiVersion ||
    !componentSet.apiVersion ||
    componentSet.sourceApiVersion === componentSet.apiVersion
  ) {
    return `*** ${action} with ${api} API v${componentSet.apiVersion ?? componentSet.sourceApiVersion} ***`;
  }
  // has both but they don't match
  return `*** ${action} v${componentSet.sourceApiVersion} metadata with ${api} API v${componentSet.apiVersion} connection ***`;
}

export const getFileResponseSuccessProps = (
  successes: FileResponseSuccess[]
): Array<Pick<FileResponseSuccess, 'filePath' | 'fullName' | 'state' | 'type'>> =>
  successes.map((s) => ({ filePath: s.filePath, fullName: s.fullName, type: s.type, state: s.state }));
