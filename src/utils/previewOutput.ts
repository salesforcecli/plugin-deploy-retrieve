/*
 * Copyright 2025, Salesforce, Inc.
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
import { isAbsolute, relative, resolve } from 'node:path';

import { Ux } from '@salesforce/sf-plugins-core';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import {
  ComponentSet,
  DestructiveChangesType,
  ForceIgnore,
  MetadataResolver,
  VirtualTreeContainer,
  MetadataType,
  SourceComponent,
  RegistryAccess,
} from '@salesforce/source-deploy-retrieve';
import { filePathsFromMetadataComponent } from '@salesforce/source-deploy-retrieve/lib/src/utils/filePathGenerator.js';

import { SourceTracking } from '@salesforce/source-tracking';
import { isSourceComponentWithXml } from './types.js';

const ux = new Ux();

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'previewMessages');

type BaseOperation = 'deploy' | 'retrieve';

// uses a type instead of an interface to satisfy oclif/table
// see https://github.com/microsoft/TypeScript/issues/15300
export type PreviewFile = {
  fullName: string;
  type: string;
  conflict: boolean;
  ignored: boolean;
  path?: string;
  projectRelativePath?: string;
  operation?: BaseOperation | 'deletePost' | 'deletePre';
};

export type PreviewResult = {
  ignored: PreviewFile[];
  conflicts: PreviewFile[];
  toDeploy: PreviewFile[];
  toDelete: PreviewFile[];
  toRetrieve: PreviewFile[];
};

const ensureAbsolutePath = (f: string): string => (isAbsolute(f) ? f : resolve(f));

// borrowed from STL populateFilesPaths.
// TODO: this goes in SDR maybe?
const resolvePaths = (
  filenames: string[],
  registry?: RegistryAccess
): Array<Pick<PreviewFile, 'type' | 'fullName' | 'path'>> => {
  // component set generated from the filenames on all local changes
  const resolver = new MetadataResolver(registry, VirtualTreeContainer.fromFilePaths(filenames), false);
  const sourceComponents = filenames
    .flatMap((filename) => {
      try {
        return resolver.getComponentsFromPath(filename);
      } catch (e) {
        // resolver will do logging before throw we don't do it here
        return [];
      }
    })
    .filter(isSourceComponentWithXml)
    .map((sc) => ({ fullName: sc.fullName, type: sc.type.name, path: ensureAbsolutePath(sc.xml) }));
  // dedupe by xml path
  return Array.from(new Map(sourceComponents.map((sc) => [sc.path, sc])).values());
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
  files.filter(willGo).filter((f) => f.operation === 'deploy');

const getWillRetrieve = (files: PreviewFile[]): PreviewFile[] =>
  files.filter(willGo).filter((f) => f.operation === 'retrieve');

const getWillDelete = (files: PreviewFile[]): PreviewFile[] =>
  files.filter(willGo).filter((f) => f.operation && ['deletePre', 'deletePost'].includes(f.operation));

// relative paths are easier on tables
const makeKey = ({ type, fullName }: { type: MetadataType; fullName: string }): string => `${type.name}#${fullName}`;

export const compileResults = ({
  componentSet,
  projectPath,
  filesWithConflicts,
  forceIgnore,
  baseOperation,
  remoteDeletes,
}: {
  componentSet: ComponentSet;
  projectPath: string;
  filesWithConflicts: Set<string>;
  forceIgnore: ForceIgnore;
  baseOperation: BaseOperation;
  remoteDeletes?: SourceComponent[];
}): PreviewResult => {
  // when we iterate all the componentSet,
  // this map makes it easy to get the source-backed local components
  const sourceBackedComponents = new Map<string, SourceComponent>(
    componentSet.getSourceComponents().map((sc) => [makeKey({ type: sc.type, fullName: sc.fullName }), sc])
  );

  const sourceComponentToPreviewFile = (c: SourceComponent): Omit<PreviewFile, 'operation'> => ({
    type: c.type.name,
    fullName: c.fullName,
    conflict: [c.xml, c.content].some((v) => v && filesWithConflicts.has(v)),
    // There should not be anything in forceignore returned by the componentSet
    ignored: [c.xml, c.content].some((v) => v && forceIgnore.denies(v)),
    // properties to return if we have an xml path
    ...getPaths(c),
  });

  /** resolve absolute and relative paths for a source component, with a preference for the xml file, but able to use the content file as backup */
  const getPaths = (c: SourceComponent): Pick<PreviewFile, 'path' | 'projectRelativePath'> => {
    const someFile = c.xml ?? c.content;
    if (someFile) {
      return {
        path: isAbsolute(someFile) ? someFile : resolve(someFile),
        // for cleaner output
        projectRelativePath: relative(projectPath, someFile),
      };
    }
    return {};
  };

  const actionableFiles = componentSet
    .filter((f) => f.fullName !== '*')
    .toArray()
    .map((c) => sourceBackedComponents.get(makeKey(c)) ?? c)
    .map((cmp): PreviewFile => {
      const maybeSourceBackedComponent = sourceBackedComponents.get(makeKey(cmp)) ?? cmp;
      if ('xml' in maybeSourceBackedComponent) {
        // source backed components exist locally
        return {
          ...sourceComponentToPreviewFile(maybeSourceBackedComponent),
          operation:
            baseOperation === 'deploy'
              ? calculateDeployOperation(maybeSourceBackedComponent.getDestructiveChangesType())
              : baseOperation,
        };
      } else {
        return {
          type: maybeSourceBackedComponent.type.name,
          fullName: maybeSourceBackedComponent.fullName,
          // if it doesn't exist locally, it can't be a conflict
          conflict: false,
          operation: baseOperation,
          // we have to calculate the "potential filename" to know if a remote retrieve would be ignored
          ignored: filePathsFromMetadataComponent(maybeSourceBackedComponent).some((p) => forceIgnore.denies(p)),
        };
      }
    })
    // remote deletes are not in the componentSet
    .concat(
      (remoteDeletes ?? []).map(
        (c): PreviewFile => ({
          ...sourceComponentToPreviewFile(c),
          operation: 'deletePre',
        })
      )
    );

  // Source backed components won't appear in the ComponentSet if ignored
  const ignoredSourceComponents = resolvePaths(
    [...(componentSet.forceIgnoredPaths ?? [])],
    new RegistryAccess(undefined, projectPath)
  ).map(
    (resolved): PreviewFile => ({
      ...resolved,
      ...(resolved.path ? { projectRelativePath: relative(projectPath, resolved.path) } : {}),
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
  ux.log();
  if (files.length === 0) {
    ux.log(StandardColors.info(messages.getMessage('deploy.none')));
  } else {
    ux.table({
      data: files,
      columns: ['type', 'fullName', { key: 'projectRelativePath', name: 'Path' }],
      title: StandardColors.success(messages.getMessage('deploy.header', [files.length])),
    });
  }
};

const printRetrieveTable = (files: PreviewFile[]): void => {
  ux.log();
  if (files.length === 0) {
    ux.log(StandardColors.info(messages.getMessage('retrieve.none')));
  } else {
    ux.table({
      data: files,
      columns: ['type', 'fullName', { key: 'projectRelativePath', name: 'Path' }],
      title: StandardColors.success(messages.getMessage('retrieve.header', [files.length])),
    });
  }
};

const printDeleteTable = (files: PreviewFile[]): void => {
  ux.log();
  if (files.length === 0) {
    ux.log(StandardColors.info(messages.getMessage('delete.none')));
  } else {
    ux.table({
      data: files,
      columns: ['type', 'fullName', { key: 'projectRelativePath', name: 'Path' }],
      title: StandardColors.warning(messages.getMessage('delete.header', [files.length])),
    });
  }
};

const printConflictsTable = (files: PreviewFile[]): void => {
  ux.log();
  if (files.length === 0) {
    ux.log(StandardColors.info(messages.getMessage('conflicts.none')));
  } else {
    ux.table({
      data: files,
      columns: ['type', 'fullName', { key: 'projectRelativePath', name: 'Path' }],
      title: StandardColors.error(messages.getMessage('conflicts.header', [files.length])),
      sort: {
        path: 'asc',
      },
    });
  }
};

const printIgnoredTable = (files: PreviewFile[], baseOperation: BaseOperation): void => {
  ux.log();
  if (files.length === 0) {
    ux.log(StandardColors.info(messages.getMessage('ignored.none')));
  } else {
    ux.table({
      data: files,
      columns: ['type', 'fullName', { key: 'projectRelativePath', name: 'Path' }],
      title: StandardColors.info(messages.getMessage('ignored.header', [files.length, baseOperation])),
      sort: {
        path: 'asc',
      },
    });
  }
};

export const printTables = (result: PreviewResult, baseOperation: BaseOperation, concise = false): void => {
  printConflictsTable(result.conflicts);
  printDeleteTable(result.toDelete);
  if (baseOperation === 'deploy') {
    printDeployTable(result.toDeploy);
  } else if (baseOperation === 'retrieve') {
    printRetrieveTable(result.toRetrieve);
  }

  if (!concise) {
    printIgnoredTable(result.ignored, baseOperation);
  }
};

export const getConflictFiles = async (stl?: SourceTracking, ignore = false): Promise<Set<string>> =>
  !stl || ignore
    ? new Set<string>()
    : new Set((await stl.getConflicts()).flatMap((conflict) => (conflict.filenames ?? []).map((f) => resolve(f))));
