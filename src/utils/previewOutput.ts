/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { CliUx } from '@oclif/core';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { bold, dim } from 'chalk';
import { Messages } from '@salesforce/core';
import { DestructiveChangesType } from '@salesforce/source-deploy-retrieve';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-deploy-retrieve', 'previewMessages', [
  'conflicts.header',
  'conflicts.none',
  'ignored.header',
  'ignored.none',
  'deploy.none',
  'deploy.header',
  'delete.header',
  'delete.none',
]);

// extending Record makes it easier to use for oclif table
export interface PreviewFile extends Record<string, unknown> {
  path: string;
  conflict: boolean;
  ignored: boolean;
  name: string;
  type: string;
  operation: 'deletePost' | 'deletePre' | 'deploy';
}

export interface PreviewResult {
  files: PreviewFile[];
}

export const calculateDeployOperation = (destructiveChangesType?: DestructiveChangesType): PreviewFile['operation'] => {
  switch (destructiveChangesType) {
    case DestructiveChangesType.POST:
      return 'deletePost';
    case DestructiveChangesType.PRE:
      return 'deletePre';
    default:
      return 'deploy';
  }
};

const getNonIgnoredConflicts = (result: PreviewResult): PreviewFile[] =>
  result.files.filter((f) => f.conflict && !f.ignored);

const getIgnored = (result: PreviewResult): PreviewFile[] => result.files.filter((f) => f.ignored);

const getWillDeploy = (result: PreviewResult): PreviewFile[] =>
  result.files.filter((f) => !f.conflict && !f.ignored && f.operation === 'deploy');

const getWillDelete = (result: PreviewResult): PreviewFile[] =>
  result.files.filter((f) => !f.conflict && !f.ignored && ['deletePre', 'deletePost'].includes(f.operation));

const columns = { type: {}, name: {}, projectRelativePath: { header: 'Path' } };

export const printDeployTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('deploy.none')));
  } else {
    // not using table title property to avoid all the ASCII art
    CliUx.ux.log(StandardColors.success(bold(messages.getMessage('deploy.header', [files.length]))));
    CliUx.ux.table(files, columns);
  }
};

export const printDeleteTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('delete.none')));
  } else {
    CliUx.ux.log(StandardColors.warning(bold(messages.getMessage('delete.header', [files.length]))));
    CliUx.ux.table(files, columns);
  }
};

export const printConflictsTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('conflicts.none')));
  } else {
    CliUx.ux.log(StandardColors.error(bold(messages.getMessage('conflicts.header', [files.length]))));
    CliUx.ux.table<PreviewFile>(files, columns, { sort: 'path' });
  }
};

export const printIgnoredTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('ignored.none')));
  } else {
    CliUx.ux.log(dim(messages.getMessage('ignored.header', [files.length])));
    CliUx.ux.table<PreviewFile>(files, columns, { sort: 'path' });
  }
};

export const printDeployTables = (result: PreviewResult): void => {
  printConflictsTable(getNonIgnoredConflicts(result));
  printDeleteTable(getWillDelete(result));
  printDeployTable(getWillDeploy(result));
  printIgnoredTable(getIgnored(result));
};
