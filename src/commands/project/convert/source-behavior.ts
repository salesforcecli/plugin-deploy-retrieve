/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfProject } from '@salesforce/core';
import {
  getValidatedProjectJson,
  TMP_DIR,
  convertToMdapi,
  DRY_RUN_DIR,
  PRESETS_PROP,
  PRESET_CHOICES,
  getPackageDirectoriesForPreset,
  convertBackToSource,
  ComponentSetAndPackageDirPath,
} from '../../../utils/convertBehavior.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.source-behavior');

export type SourceBehaviorResult = {
  [PRESETS_PROP]: string[];
  deletedFiles: string[];
  createdFiles: string[];
};

export default class ConvertSourceBehavior extends SfCommand<SourceBehaviorResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';
  public static readonly requiresProject = true;

  public static readonly flags = {
    behavior: Flags.option({
      summary: messages.getMessage('flags.behavior.summary'),
      char: 'b',
      required: true,
      options: PRESET_CHOICES,
    })(),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
    }),
    'preserve-temp-dir': Flags.boolean({
      summary: messages.getMessage('flags.preserve-temp-dir.summary'),
    }),
    'target-org': Flags.optionalOrg(),
  };

  public async run(): Promise<SourceBehaviorResult> {
    const { flags } = await this.parse(ConvertSourceBehavior);
    if (await flags['target-org']?.supportsSourceTracking()) {
      throw messages.createError('error.trackingNotSupported');
    }
    const projectJson = getValidatedProjectJson(flags.behavior, this.project!);
    const [backupPjsonContents, packageDirsWithDecomposable] = await Promise.all([
      flags['dry-run'] ? readFile(projectJson.getPath()) : '',
      getPackageDirectoriesForPreset(this.project!, flags.behavior),
    ]);

    this.warn(messages.getMessage('basicConfirmation'));
    if (!packageDirsWithDecomposable.every(hasMainDefault(this.project!.getPath()))) {
      this.warn(messages.getMessage('mainDefaultConfirmation'));
    }
    await this.confirm({ message: 'Proceed' });

    const filesToDelete = await convertToMdapi(packageDirsWithDecomposable);

    // flip the preset in the sfdx-project.json, even for dry-run, since the registry will need for conversions
    projectJson.set(PRESETS_PROP, [...(projectJson.get<string[]>(PRESETS_PROP) ?? []), flags.behavior]);
    await projectJson.write();
    this.info(`sfdx-project.json ${PRESETS_PROP} is now [${projectJson.get<string[]>(PRESETS_PROP).join(',')}]`);

    // delete the “original” files that no longer work because of project update
    await Promise.all(flags['dry-run'] ? [] : filesToDelete.map((f) => rm(f)));

    // @ts-expect-error there's publicly accessible way to clear a project's instance
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    SfProject.instances.clear();

    const createdFiles = await convertBackToSource({
      packageDirsWithPreset: packageDirsWithDecomposable,
      projectDir: this.project!.getPath(),
      dryRun: flags['dry-run'],
    });

    if (!flags['preserve-temp-dir']) {
      await rm(TMP_DIR, { recursive: true });
    }

    this.table(
      filesToDelete.map((f) => ({ value: f })),
      { value: { header: flags['dry-run'] ? 'Files that would have been deleted if not --dry-run' : 'Deleted Files' } }
    );
    this.log();
    this.table(
      createdFiles.map((f) => ({ value: f })),
      { value: { header: 'Created Files' } }
    );
    if (flags['dry-run']) {
      // put it back how it was
      await writeFile(projectJson.getPath(), backupPjsonContents);
      this.logSuccess(messages.getMessage('success.dryRun', [DRY_RUN_DIR]));
    }

    return {
      createdFiles,
      deletedFiles: filesToDelete,
      sourceBehaviorOptions: projectJson.get<string[]>(PRESETS_PROP),
    };
  }
}

/** convert will put things in /main/default.  If the packageDirs aren't configured that way, we'll need to warn the user
 * See https://salesforce.quip.com/va5IAgXmTMWF for details on that issue */
const hasMainDefault =
  (projectDir: string) =>
  (i: ComponentSetAndPackageDirPath): boolean =>
    existsSync(join(projectDir, i.packageDirPath, 'main', 'default'));
