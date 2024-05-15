/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError, SfProject, SfProjectJson } from '@salesforce/core';
import {
  ComponentSet,
  ComponentSetBuilder,
  MetadataConverter,
  MetadataRegistry,
} from '@salesforce/source-deploy-retrieve';
import { isString } from '@salesforce/ts-types';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'project.decompose');

export type ProjectDecomposeResult = {
  presets: string[];
};

// TODO: there must be a cleaner way to read this
const PRESET_DIR = join(import.meta.resolve('@salesforce/source-deploy-retrieve'), '..', 'registry', 'presets').replace(
  'file:',
  ''
);
const PRESET_CHOICES = (await readdir(PRESET_DIR)).map((f) => f.replace('.json', ''));
const TMP_DIR = process.env.SF_MDAPI_TEMP_DIR ?? 'decompositionConverterTempDir';

export default class ProjectDecompose extends SfCommand<ProjectDecomposeResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'beta';
  public static readonly requiresProject = true;

  public static readonly flags = {
    preset: Flags.option({
      summary: messages.getMessage('flags.preset.summary'),
      char: 'p',
      required: true,
      options: PRESET_CHOICES,
    })(),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
    }),
    'preserve-temp-dir': Flags.boolean({
      summary: messages.getMessage('flags.preserve-temp-dir.summary'),
    }),
    'source-dir': Flags.directory({
      summary: messages.getMessage('flags.source-dir.summary'),
      char: 'd',
      required: true,
      multiple: true,
      exists: true,
    }),
  };

  public async run(): Promise<ProjectDecomposeResult> {
    const { flags } = await this.parse(ProjectDecompose);
    const projectJson = getValidatedProjectJson(flags.preset, this.project);
    const typesFromPreset = Object.values(
      (JSON.parse(await readFile(join(PRESET_DIR, `${flags.preset}.json`), 'utf-8')) as MetadataRegistry).types
    ).map((t) => t.name);

    const cs = await ComponentSetBuilder.build({
      metadata: {
        metadataEntries: typesFromPreset,
        directoryPaths: this.project!.getPackageDirectories().map((pd) => pd.path),
      },
    });

    await new MetadataConverter().convert(cs, 'metadata', {
      type: 'directory',
      outputDirectory: TMP_DIR,
      genUniqueDir: false,
    });

    // convert to the mdapi targetDir
    // 1. maintain a list of “where this was originally” since we’ll need to handle MPD scenarios.
    // Alteratively, the CS might have this.
    // Alternatively, we could do a CS per packageDir

    // flip the preset in the sfdx-project.json
    if (flags['dry-run']) {
      this.log('TODO: dry-run output');
    } else {
      projectJson.set('registryPresets', [...(projectJson.get<string[]>('registryPresets') ?? []), flags.preset]);
      await projectJson.write();
    }

    // delete the “original” files
    if (flags['dry-run']) {
      this.log(`would remove ${getComponentSetFiles(cs).join(', ')}`);
    } else {
      await Promise.all(getComponentSetFiles(cs).map((f) => rm(f)));
    }

    // TODO: mdapi=>source convert the target dir back to the project

    if (!flags['preserve-temp-dir']) {
      await rm(TMP_DIR, { recursive: true });
    }

    return {
      presets: projectJson.get<string[]>('registryPresets'),
    };
  }
}

/** get the LOCAL project json, throws if not present OR the preset already exists */
const getValidatedProjectJson = (preset: string, project?: SfProject): SfProjectJson => {
  const projectJson = project?.getSfProjectJson(false);
  if (!projectJson) {
    throw SfError.create({ name: 'ProjectJsonNotFound', message: 'sfdx-project.json not found' });
  }
  if (projectJson.get<string[]>('registryPresets')?.includes(preset)) {
    throw SfError.create({
      name: 'PresetAlreadyExists',
      message: `Preset ${preset} already exists in sfdx-project.json`,
    });
  }
  return projectJson;
};

const getComponentSetFiles = (cs: ComponentSet): string[] =>
  cs
    .getSourceComponents()
    .toArray()
    .flatMap((c) => [c.xml, ...c.walkContent()])
    .filter(isString);
