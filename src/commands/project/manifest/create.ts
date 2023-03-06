/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'path';
import * as fs from 'fs';
import { Messages } from '@salesforce/core';
import { ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'manifest.create');

const manifestTypes = {
  pre: 'destructiveChangesPre.xml',
  post: 'destructiveChangesPost.xml',
  destroy: 'destructiveChanges.xml',
  package: 'package.xml',
};

const packageTypes: Record<string, string[]> = {
  managed: ['beta', 'deleted', 'deprecated', 'installed', 'released'],
  unlocked: ['deprecatedEditable', 'installedEditable'],
};

export type CreateCommandResult = {
  name: string;
  path: string;
};

const xorFlags = ['metadata', 'source-path', 'from-org'];
export class Create extends SfCommand<CreateCommandResult> {
  public static readonly summary = messages.getMessage('description');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    metadata: arrayWithDeprecation({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exactlyOne: xorFlags,
    }),
    'source-path': arrayWithDeprecation({
      char: 'p',
      aliases: ['sourcepath'],
      deprecateAliases: true,
      description: messages.getMessage('flags.source-path'),
      exactlyOne: xorFlags,
    }),
    'manifest-name': Flags.string({
      char: 'n',
      aliases: ['manifestname'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.manifest-name'),
      exclusive: ['manifest-type'],
    }),
    'manifest-type': Flags.string({
      aliases: ['manifesttype'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.manifest-type'),
      options: Object.keys(manifestTypes),
      char: 't',
    }),
    'include-packages': arrayWithDeprecation({
      aliases: ['includepackages'],
      deprecateAliases: true,
      description: messages.getMessage('flags.include-packages'),
      options: Object.keys(packageTypes),
      char: 'c',
      dependsOn: ['fromorg'],
    }),
    'from-org': Flags.optionalOrg({
      summary: messages.getMessage('flags.from-org'),
      exactlyOne: xorFlags,
      aliases: ['fromorg'],
      deprecateAliases: true,
    }),
    'output-dir': Flags.string({
      char: 'd',
      aliases: ['outputdir', 'o'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.output-dir'),
    }),
  };
  private manifestName!: string;
  private outputDir!: string | undefined;
  private outputPath!: string;
  private includePackages!: string[] | undefined;
  private flags!: Interfaces.InferredFlags<typeof Create.flags>;

  public async run(): Promise<CreateCommandResult> {
    this.flags = (await this.parse(Create)).flags;
    await this.createManifest();
    return this.formatResult();
  }

  protected async createManifest(): Promise<void> {
    // convert the manifesttype into one of the "official" manifest names
    // if no manifesttype flag passed, use the manifestname flag
    // if no manifestname flag, default to 'package.xml'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - allow potentially undefined index of manifestTypes, fall backs will guarantee a result
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.manifestName = manifestTypes[this.flags['manifest-type']] ?? this.flags['manifest-name'] ?? 'package.xml';
    this.outputDir = this.flags['output-dir'];
    this.includePackages = this.flags['include-packages'];

    let exclude: string[] = [];
    if (this.includePackages) {
      Object.keys(packageTypes).forEach(
        (type) => (exclude = !this.includePackages?.includes(type) ? exclude.concat(packageTypes[type]) : exclude)
      );
    } else {
      exclude = Object.values(packageTypes).flat();
    }

    const componentSet = await ComponentSetBuilder.build({
      apiversion: this.flags['api-version'] ?? ((await this.project.resolveProjectConfig()).sourceApiVersion as string),
      sourcepath: this.flags['source-path'],
      metadata: this.flags.metadata && {
        metadataEntries: this.flags.metadata,
        directoryPaths: this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath),
      },
      org: this.flags['from-org'] && {
        username: this.flags['from-org'].getUsername() as string,
        exclude,
      },
    });

    // add the .xml suffix if the user just provided a file name
    this.manifestName = this.manifestName.endsWith('.xml') ? this.manifestName : `${this.manifestName}.xml`;

    if (this.outputDir) {
      await fs.promises.mkdir(this.outputDir, { recursive: true });
      this.outputPath = join(this.outputDir, this.manifestName);
    } else {
      this.outputPath = this.manifestName;
    }

    return fs.promises.writeFile(this.outputPath, await componentSet.getPackageXml());
  }

  protected formatResult(): CreateCommandResult {
    if (this.outputDir) {
      this.log(messages.getMessage('successOutputDir', [this.manifestName, this.outputDir]));
    } else {
      this.log(messages.getMessage('success', [this.manifestName]));
    }

    return { path: this.outputPath, name: this.manifestName };
  }
}
