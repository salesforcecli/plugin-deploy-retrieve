/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SfError, SfProject, SfProjectJson, Messages } from '@salesforce/core';
import {
  ComponentSet,
  ComponentSetBuilder,
  ConvertResult,
  MetadataConverter,
  MetadataRegistry,
  RegistryAccess,
  SourceComponent,
  presetMap,
} from '@salesforce/source-deploy-retrieve';
import { isString } from '@salesforce/ts-types';

export type ComponentSetAndPackageDirPath = { packageDirPath: string; cs: ComponentSet };

// TODO: there could be a cleaner way to read this
const PRESET_DIR = fileURLToPath(
  join(import.meta.resolve('@salesforce/source-deploy-retrieve'), '..', 'registry', 'presets')
);
export const PRESETS_PROP = 'sourceBehaviorOptions';
export const PRESET_CHOICES = [...presetMap.keys()];
export const TMP_DIR = process.env.SF_MDAPI_TEMP_DIR ?? 'decompositionConverterTempDir';
export const DRY_RUN_DIR = 'DRY-RUN-RESULTS';

/** returns packageDirectories and ComponentsSets where there is metadata of the type we'll change the behavior for */
export const getPackageDirectoriesForPreset = async ({
  project,
  preset,
  dryRun,
}: {
  project: SfProject;
  preset: string;
  dryRun: boolean;
}): Promise<ComponentSetAndPackageDirPath[]> => {
  const projectDir = project.getPath();
  const output = (
    await Promise.all(
      project
        .getPackageDirectories()
        .map((pd) => pd.path)
        .map(componentSetFromPackageDirectory(projectDir)(await getTypesFromPreset(preset)))
    )
  ).filter(componentSetIsNonEmpty);

  if (output.length === 0) {
    loadMessages().createError('error.noTargetTypes', [preset]);
  }

  return dryRun
    ? output // dryRun isn't modifying the project, so we don't need to validate the structure
    : // we do this after filtering componentSets to reduce false positives (ex: dir does not have main/default but also has nothing to decompose)
      output.map(validateMainDefault(projectDir));
};

/** converts the composed metadata to mdapi format in a temp dir */
export const convertToMdapi = async (packageDirsWithDecomposable: ComponentSetAndPackageDirPath[]): Promise<string[]> =>
  (
    await Promise.all(
      packageDirsWithDecomposable.map(async (pd) => {
        // convert to the mdapi targetDir
        await new MetadataConverter().convert(pd.cs, 'metadata', {
          type: 'directory',
          outputDirectory: join(TMP_DIR, pd.packageDirPath),
          genUniqueDir: false,
        });

        return getComponentSetFiles(pd.cs);
      })
    )
  )
    .flat()
    .map((f) => resolve(f));

/** get the LOCAL project json, throws if not present OR the preset already exists */
export const getValidatedProjectJson = (preset: string, project: SfProject): SfProjectJson => {
  const projectJson = project.getSfProjectJson(false);
  if (projectJson.get<string[]>(PRESETS_PROP)?.includes(preset)) {
    throw SfError.create({
      name: 'sourceBehaviorOptionAlreadyExists',
      message: `sourceBehaviorOption ${preset} already exists in sfdx-project.json`,
    });
  }
  return projectJson;
};

/** converts the temporary mdapi back to source, return a list of the created files */
export const convertBackToSource = async ({
  packageDirsWithPreset,
  projectDir,
  dryRun,
}: {
  packageDirsWithPreset: ComponentSetAndPackageDirPath[];
  projectDir: string;
  /** if provided, will output the results into a separate directory outside the project's packageDirectories */
  dryRun: boolean;
}): Promise<string[]> => [
  ...new Set(
    (
      await convertToSource({
        packageDirsWithPreset,
        projectDir,
        dryRunDir: dryRun ? DRY_RUN_DIR : undefined,
      })
    )
      .flatMap((cr) => cr.converted ?? [])
      // we can't use walkContent because there's a conditional inside it
      .flatMap(getSourceComponentFiles)
      .filter(isString)
  ),
];

const getSourceComponentFiles = (c: SourceComponent): string[] =>
  [c.xml, ...(c.content ? fullPathsFromDir(c.content) : [])].filter(isString);

const fullPathsFromDir = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).map((d) => join(d.path, d.name));

/** build a component set from the original project for each pkgDir */
const componentSetFromPackageDirectory =
  (projectDir: string) =>
  (metadataEntries: string[]) =>
  async (packageDir: string): Promise<ComponentSetAndPackageDirPath> => ({
    packageDirPath: packageDir,
    cs: await ComponentSetBuilder.build({
      metadata: {
        metadataEntries,
        directoryPaths: [packageDir],
      },
      projectDir,
    }),
  });

const convertToSource = async ({
  packageDirsWithPreset,
  projectDir,
  dryRunDir,
}: {
  packageDirsWithPreset: ComponentSetAndPackageDirPath[];
  projectDir: string;
  dryRunDir?: string;
}): Promise<ConvertResult[]> => {
  // mdapi=>source convert the target dir back to the project
  // it's a new converter because the project has changed and it should reload the project's registry.
  const converter = new MetadataConverter(new RegistryAccess(undefined, projectDir));
  return Promise.all(
    packageDirsWithPreset.map(async (pd) =>
      converter.convert(
        // componentSet based on each mdapi folder
        await ComponentSetBuilder.build({ sourcepath: [join(TMP_DIR, pd.packageDirPath)], projectDir }),
        'source',
        dryRunDir
          ? // dryRun outputs to a dir outside the real packageDirs folder to avoid changing real stuff
            {
              type: 'directory',
              outputDirectory: join(projectDir, dryRunDir),
              packageName: pd.packageDirPath,
              genUniqueDir: false,
            }
          : {
              type: 'merge',
              mergeWith: (
                await ComponentSetBuilder.build({
                  sourcepath: [pd.packageDirPath],
                  projectDir,
                })
              ).getSourceComponents(),
              defaultDirectory: join(projectDir, pd.packageDirPath),
            }
      )
    )
  );
};

export const getTypesFromPreset = async (preset: string): Promise<string[]> =>
  Object.values(
    (JSON.parse(await readFile(join(PRESET_DIR, `${preset}.json`), 'utf-8')) as MetadataRegistry).types
  ).map((t) => t.name);

/** convert will put things in /main/default.  If the packageDirs aren't configured that way, we don't want to make a mess.
 * See https://salesforce.quip.com/va5IAgXmTMWF for details on that issue */
const validateMainDefault =
  (projectDir: string) =>
  (i: ComponentSetAndPackageDirPath): ComponentSetAndPackageDirPath => {
    if (!existsSync(join(projectDir, i.packageDirPath, 'main', 'default'))) {
      throw loadMessages().createError(
        'error.packageDirectoryNeedsMainDefault',
        [i.packageDirPath],
        [i.packageDirPath]
      );
    }
    return i;
  };

const getComponentSetFiles = (cs: ComponentSet): string[] =>
  cs
    .getSourceComponents()
    .toArray()
    .flatMap((c) => [c.xml, ...c.walkContent()])
    .filter(isString);

const loadMessages = (): Messages<string> => {
  Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
  return Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.source-behavior');
};
const componentSetIsNonEmpty = (i: ComponentSetAndPackageDirPath): boolean => i.cs.size > 0;
