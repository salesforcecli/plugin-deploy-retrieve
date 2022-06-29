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
  MetadataComponent,
  MetadataType,
  SourceComponent,
} from '@salesforce/source-deploy-retrieve';
import { filePathsFromMetadataComponent } from '@salesforce/source-deploy-retrieve/lib/src/utils/filePathGenerator';

import { SourceTracking } from '@salesforce/source-tracking';

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
  'retrieve.header',
  'retrieve.none',
]);

// extending Record makes it easier to use for oclif table
type BaseOperation = 'deploy' | 'retrieve';
export interface PreviewFile extends Record<string, unknown> {
  name: string;
  type: string;
  conflict: boolean;
  ignored: boolean;
  path?: string;
  projectRelativePath?: string;
  operation?: BaseOperation | 'deletePost' | 'deletePre';
}

export interface PreviewResult {
  ignored: PreviewFile[];
  conflicts: PreviewFile[];
  toDeploy: PreviewFile[];
  toDelete: PreviewFile[];
  toRetrieve: PreviewFile[];
}

const ensureAbsolutePath = (f: string): string => (path.isAbsolute(f) ? f : path.resolve(f));

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
    .filter((sc) => sc && 'fullName' in sc && 'type' in sc)
    .map((sc) => ({ name: sc.fullName, type: sc.type.name, path: ensureAbsolutePath(sc.xml) }));
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

const getWillRetrieve = (files: PreviewFile[]): PreviewFile[] =>
  files.filter((f) => willGo(f) && f.operation === 'retrieve');

const getWillDelete = (files: PreviewFile[]): PreviewFile[] =>
  files.filter((f) => willGo(f) && ['deletePre', 'deletePost'].includes(f.operation));

// relative paths are easier on tables
const columns = { type: {}, name: {}, projectRelativePath: { header: 'Path' } };
const makeKey = ({ type, fullName }: { type: MetadataType; fullName: string }): string => `${type.name}#${fullName}`;

export const compileResults = ({
  componentSet,
  projectPath,
  filesWithConflicts,
  forceIgnore,
  baseOperation,
}: {
  componentSet: ComponentSet;
  projectPath: string;
  filesWithConflicts: Set<string>;
  forceIgnore: ForceIgnore;
  baseOperation: BaseOperation;
}): PreviewResult => {
  // when we iterate all the componentSet,
  // this map makes it easy to get the source-backed local components
  const sourceBackedComponents = new Map<string, SourceComponent>(
    componentSet.getSourceComponents().map((sc) => [makeKey({ type: sc.type, fullName: sc.fullName }), sc])
  );

  const actionableFiles = componentSet
    .toArray()
    .map((c): SourceComponent | MetadataComponent => sourceBackedComponents.get(makeKey(c)) ?? c)
    .map(
      (c): PreviewFile =>
        'xml' in c
          ? // source backed components exist locally
            {
              type: c.type.name,
              name: c.fullName,
              path: path.isAbsolute(c.xml) ? c.xml : path.resolve(c.xml), // SDR/SourceComponent uses absolute path
              projectRelativePath: path.relative(projectPath, c.xml), // for cleaner output
              conflict: [c.xml, c.content].some((v) => v && filesWithConflicts.has(v)),
              // There should not be anything in forceignore returned by the componentSet
              ignored: [c.xml, c.content].some((v) => v && forceIgnore.denies(v)),
              operation:
                baseOperation === 'deploy' ? calculateDeployOperation(c.getDestructiveChangesType()) : baseOperation,
            }
          : // only name/type information for remote-only components that have not been retrieved
            {
              type: c.type.name,
              name: c.fullName,
              operation: baseOperation,
              // if it doesn't exist locally, it can't be a conflict
              conflict: false,
              // we have to calculate the "potential filename" to know if a remote retrieve would be ignored
              ignored: filePathsFromMetadataComponent(c).some((p) => forceIgnore.denies(p)),
            }
    );

  // Source backed components won't appear in the ComponentSet if ignored
  const ignoredSourceComponents = resolvePaths([...(componentSet.forceIgnoredPaths ?? [])]).map(
    (resolved): PreviewFile => ({
      ...resolved,
      projectRelativePath: path.relative(projectPath, resolved.path),
      conflict: false,
      ignored: true,
    })
  );

  return {
    ignored: ignoredSourceComponents.concat(actionableFiles.filter((f) => f.ignored)),
    toDeploy: getWillDeploy(actionableFiles),
    toRetrieve: getWillRetrieve(actionableFiles),
    toDelete: getWillDelete(actionableFiles),
    conflicts: getNonIgnoredConflicts(actionableFiles),
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

const printRetrieveTable = (files: PreviewFile[]): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('retrieve.none')));
  } else {
    // not using table title property to avoid all the ASCII art
    CliUx.ux.log(StandardColors.success(bold(messages.getMessage('retrieve.header', [files.length]))));
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

const printConflictsTable = (files: PreviewFile[], baseOperation: BaseOperation): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('conflicts.none')));
  } else {
    CliUx.ux.log(StandardColors.error(bold(messages.getMessage('conflicts.header', [files.length, baseOperation]))));
    CliUx.ux.table<PreviewFile>(files, columns, { sort: 'path' });
  }
};

const printIgnoredTable = (files: PreviewFile[], baseOperation: BaseOperation): void => {
  CliUx.ux.log();
  if (files.length === 0) {
    CliUx.ux.log(dim(messages.getMessage('ignored.none')));
  } else {
    CliUx.ux.log(dim(messages.getMessage('ignored.header', [files.length, baseOperation])));
    CliUx.ux.table<PreviewFile>(files, columns, { sort: 'path' });
  }
};

export const printDeployTables = (result: PreviewResult, baseOperation: BaseOperation): void => {
  printConflictsTable(result.conflicts, baseOperation);
  if (baseOperation === 'deploy') {
    printDeleteTable(result.toDelete);
    printDeployTable(result.toDeploy);
  } else if (baseOperation === 'retrieve') {
    printRetrieveTable(result.toRetrieve);
  }
  printIgnoredTable(result.ignored, baseOperation);
};

export const getConflictFiles = async (stl?: SourceTracking, ignore = false): Promise<Set<string>> => {
  return !stl || ignore
    ? new Set<string>()
    : new Set((await stl.getConflicts()).flatMap((conflict) => conflict.filenames.map((f) => path.resolve(f))));
};
