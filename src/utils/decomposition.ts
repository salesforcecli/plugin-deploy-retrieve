/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { existsSync, readdirSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { SfError, SfProject, SfProjectJson, Messages } from '@salesforce/core';
import {
  ComponentSet,
  ComponentSetBuilder,
  ConvertResult,
  MetadataConverter,
  MetadataRegistry,
  RegistryAccess,
  SourceComponent,
} from '@salesforce/source-deploy-retrieve';
import { isString } from '@salesforce/ts-types';

export type ComponentSetAndPackageDirPath = { packageDirPath: string; cs: ComponentSet };

// TODO: there must be a cleaner way to read this
const PRESET_DIR = join(import.meta.resolve('@salesforce/source-deploy-retrieve'), '..', 'registry', 'presets').replace(
  'file:',
  ''
);
export const PRESETS_PROP = 'sourceBehaviorOptions';
export const PRESET_CHOICES = (await readdir(PRESET_DIR)).map((f) => f.replace('.json', ''));
export const TMP_DIR = process.env.SF_MDAPI_TEMP_DIR ?? 'decompositionConverterTempDir';

/** returns packageDirectories and ComponentsSets where there is metadata of the type we'll decompose */
export const getDecomposablePackageDirectories = async (
  project: SfProject,
  preset: string
): Promise<ComponentSetAndPackageDirPath[]> =>
  (
    await Promise.all(
      project
        .getPackageDirectories()
        .map((pd) => pd.path)
        .map(componentSetFromPackageDirectory(project.getPath())(await getTypesFromPreset(preset)))
    )
  )
    .filter(componentSetIsNonEmpty)
    // we do this after filtering componentSets to reduce false positives (ex: dir does not have main/default but also has nothing to decompose)
    .map(validateMainDefault(project.getPath()));

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
  ).flat();

export const convertToSource = async ({
  packageDirsWithDecomposable,
  projectDir,
  dryRunDir,
}: {
  packageDirsWithDecomposable: ComponentSetAndPackageDirPath[];
  projectDir: string;
  dryRunDir?: string;
}): Promise<ConvertResult[]> => {
  // mdapi=>source convert the target dir back to the project
  // it's a new converter because the project has changed and it should reload the project's registry.
  const converter = new MetadataConverter(new RegistryAccess(undefined, projectDir));
  return Promise.all(
    packageDirsWithDecomposable.map(async (pd) =>
      converter.convert(
        // cs from the mdapi folder
        await ComponentSetBuilder.build({ sourcepath: [join(TMP_DIR, pd.packageDirPath)], projectDir }),
        'source',
        dryRunDir
          ? // dryRun outputs to a dir outside the real packageDirs folder to avoid changing real stuff
            { type: 'directory', genUniqueDir: false, outputDirectory: join(dryRunDir, pd.packageDirPath) }
          : {
              type: 'merge',
              mergeWith: (
                await ComponentSetBuilder.build({
                  sourcepath: [pd.packageDirPath],
                  projectDir,
                })
              ).getSourceComponents(),
              defaultDirectory: pd.packageDirPath,
            }
      )
    )
  );
};

/** build a component set from the original project for each pkgDir */
export const componentSetFromPackageDirectory =
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

const getSourceComponentFiles = (c: SourceComponent): string[] =>
  [
    c.xml,
    ...(c.content ? readdirSync(c.content, { withFileTypes: true }).map((d) => join(d.path, d.name)) : []),
  ].filter(isString);

/** converts the temporary mdapi back to source, return a list of the created files */
export const convertBackToSource = async ({
  packageDirsWithDecomposable,
  projectDir,
  dryRun,
}: {
  packageDirsWithDecomposable: ComponentSetAndPackageDirPath[];
  projectDir: string;
  /** if provided, will output the results into a separate directory outside the project's packageDirectories */
  dryRun: boolean;
}): Promise<string[]> => [
  ...new Set(
    (
      await convertToSource({
        packageDirsWithDecomposable,
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

const getTypesFromPreset = async (preset: string): Promise<string[]> =>
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
  return Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'project.decompose');
};
const componentSetIsNonEmpty = (i: ComponentSetAndPackageDirPath): boolean => i.cs.size > 0;
export const DRY_RUN_DIR = 'DRY-RUN-RESULTS';
