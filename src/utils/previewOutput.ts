/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { CliUx } from '@oclif/core';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { bold, dim } from 'chalk';
import { Messages } from '@salesforce/core';
import {
  ComponentSet,
  DestructiveChangesType,
  ForceIgnore,
  MetadataResolver,
  VirtualTreeContainer,
} from '@salesforce/source-deploy-retrieve';

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
  projectRelativePath: string;
  conflict: boolean;
  ignored: boolean;
  name: string;
  type: string;
  operation?: 'deletePost' | 'deletePre' | 'deploy';
}

export interface PreviewResult {
  files: PreviewFile[];
  ignored: PreviewFile[];
  conflicts: PreviewFile[];
  toDeploy: PreviewFile[];
  toDelete: PreviewFile[];
}

// borrowed from STL populateFilesPaths.
// TODO: this goes in SDR maybe?
const resolvePaths = (filenames: string[]): Array<Pick<PreviewFile, 'type' | 'name' | 'path'>> => {
  // component set generated from the filenames on all local changes
  const resolver = new MetadataResolver(undefined, VirtualTreeContainer.fromFilePaths(filenames), false);
  return filenames
    .flatMap((filename) => {
      try {
        return resolver.getComponentsFromPath(filename);
      } catch (e) {
        // logger.warn(`unable to resolve ${filename}`);
        return undefined;
      }
    })
    .filter((sc) => 'name' in sc && 'type' in sc)
    .map((sc) => ({ name: sc.fullName, type: sc.type.name, path: sc.xml }));
};

const calculateDeployOperation = (destructiveChangesType?: DestructiveChangesType): PreviewFile['operation'] => {
  switch (destructiveChangesType) {
    case DestructiveChangesType.POST:
      return 'deletePost';
    case DestructiveChangesType.PRE:
      return 'deletePre';
    default:
      return 'deploy';
  }
};

const getNonIgnoredConflicts = (files: PreviewFile[]): PreviewFile[] => files.filter((f) => f.conflict && !f.ignored);

const willGo = (previewFile: PreviewFile): boolean => !previewFile.conflict && !previewFile.ignored;

const getWillDeploy = (files: PreviewFile[]): PreviewFile[] =>
  files.filter((f) => willGo(f) && f.operation === 'deploy');

const getWillDelete = (files: PreviewFile[]): PreviewFile[] =>
  files.filter((f) => willGo(f) && ['deletePre', 'deletePost'].includes(f.operation));

// relative paths are easier on tables
const columns = { type: {}, name: {}, projectRelativePath: { header: 'Path' } };

export const compileResults = ({
  componentSet,
  projectPath,
  filesWithConflicts,
  forceIgnore,
}: {
  componentSet: ComponentSet;
  projectPath: string;
  filesWithConflicts: Set<string>;
  forceIgnore: ForceIgnore;
}): PreviewResult => {
  const filesToDeployOrDelete = [
    ...componentSet.getSourceComponents().map(
      (c): PreviewFile => ({
        type: c.type.name,
        name: c.fullName,
        path: c.xml, // source component uses absolute path
        projectRelativePath: path.relative(projectPath, c.xml), // for cleaner output
        conflict: [c.xml, c.content].some((v) => v && filesWithConflicts.has(v)),
        // There should not be anything in forceignore returned by the componentSet
        ignored: [c.xml, c.content].some((v) => v && forceIgnore.denies(v)),
        operation: calculateDeployOperation(c.getDestructiveChangesType()),
      })
    ),
  ];
  const ignored = resolvePaths([...(componentSet.forceIgnoredPaths ?? [])]).map(
    (resolved): PreviewFile => ({
      ...resolved,
      projectRelativePath: path.relative(projectPath, resolved.path),
      conflict: false,
      ignored: true,
    })
  );

  return {
    files: filesToDeployOrDelete,
    ignored,
    toDeploy: getWillDeploy(filesToDeployOrDelete),
    toDelete: getWillDelete(filesToDeployOrDelete),
    conflicts: getNonIgnoredConflicts(filesToDeployOrDelete),
  };
};

const printDeployTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('deploy.none')));
  } else {
    // not using table title property to avoid all the ASCII art
    CliUx.ux.log(StandardColors.success(bold(messages.getMessage('deploy.header', [files.length]))));
    CliUx.ux.table(files, columns);
  }
};

const printDeleteTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('delete.none')));
  } else {
    CliUx.ux.log(StandardColors.warning(bold(messages.getMessage('delete.header', [files.length]))));
    CliUx.ux.table(files, columns);
  }
};

const printConflictsTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('conflicts.none')));
  } else {
    CliUx.ux.log(StandardColors.error(bold(messages.getMessage('conflicts.header', [files.length]))));
    CliUx.ux.table<PreviewFile>(files, columns, { sort: 'path' });
  }
};

const printIgnoredTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('ignored.none')));
  } else {
    CliUx.ux.log(dim(messages.getMessage('ignored.header', [files.length])));
    CliUx.ux.table<PreviewFile>(files, columns, { sort: 'path' });
  }
};

export const printDeployTables = (result: PreviewResult): void => {
  printConflictsTable(result.conflicts);
  printDeleteTable(result.toDelete);
  printDeployTable(result.toDeploy);
  printIgnoredTable(result.ignored);
};
