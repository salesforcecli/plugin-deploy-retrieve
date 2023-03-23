/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'path';
import * as fs from 'fs';
import { Messages, Org } from '@salesforce/core';
import { ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import { getPackageDirs, getSourceApiVersion } from '../../../utils/project';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'manifest.create');

const manifestTypes = {
  pre: 'destructiveChangesPre.xml',
  post: 'destructiveChangesPost.xml',
  destroy: 'destructiveChanges.xml',
  package: 'package.xml',
} as const;

const packageTypes: Record<string, string[]> = {
  managed: ['beta', 'deleted', 'deprecated', 'installed', 'released'],
  unlocked: ['deprecatedEditable', 'installedEditable'],
};

export type CreateCommandResult = {
  name: string;
  path: string;
};

const xorFlags = ['metadata', 'source-dir', 'from-org'];

export class Create extends SfCommand<CreateCommandResult> {
  public static readonly summary = messages.getMessage('description');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly aliases = ['force:source:manifest:create'];
  public static readonly deprecateAliases = true;
  public static readonly requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    metadata: arrayWithDeprecation({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exactlyOne: xorFlags,
    }),
    'source-dir': arrayWithDeprecation({
      char: 'p',
      aliases: ['sourcepath'],
      deprecateAliases: true,
      description: messages.getMessage('flags.source-dir'),
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
    'from-org': Flags.custom({
      summary: messages.getMessage('flags.from-org'),
      exactlyOne: xorFlags,
      aliases: ['fromorg'],
      deprecateAliases: true,
      parse: async (input: string | undefined) => (input ? Org.create({ aliasOrUsername: input }) : undefined),
    })(),
    'output-dir': Flags.string({
      char: 'd',
      aliases: ['outputdir', 'o'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.output-dir'),
    }),
  };

  public async run(): Promise<CreateCommandResult> {
    const { flags } = await this.parse(Create);
    // convert the manifesttype into one of the "official" manifest names
    // if no manifesttype flag passed, use the manifestname?flag
    // if no manifestname flag, default to 'package.xml'
    const manifestTypeFromFlag = flags['manifest-type'] as keyof typeof manifestTypes;
    const manifestName = ensureFileEnding(
      typeof manifestTypeFromFlag === 'string'
        ? manifestTypes[manifestTypeFromFlag]
        : flags['manifest-name'] ?? 'package.xml',
      '.xml'
    );

    const componentSet = await ComponentSetBuilder.build({
      apiversion: flags['api-version'] ?? (await getSourceApiVersion()),
      sourcepath: flags['source-dir'],
      metadata: flags.metadata
        ? {
            metadataEntries: flags.metadata,
            directoryPaths: await getPackageDirs(),
          }
        : undefined,
      org: flags['from-org']
        ? {
            username: flags['from-org'].getUsername() as string,
            exclude: exclude(flags['include-packages']),
          }
        : undefined,
    });

    const outputDir = flags['output-dir'];
    if (outputDir) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    const outputPath = outputDir ? join(outputDir, manifestName) : manifestName;
    await fs.promises.writeFile(outputPath, await componentSet.getPackageXml());

    this.log(
      outputDir
        ? messages.getMessage('successOutputDir', [manifestName, outputDir])
        : messages.getMessage('success', [manifestName])
    );

    return { path: outputPath, name: manifestName };
  }
}

const ensureFileEnding = (fileName: string, fileEnding: string): string =>
  fileName.endsWith(fileEnding) ? fileName : `${fileName}${fileEnding}`;

const exclude = (includedPackages: string[] | undefined): string[] =>
  includedPackages
    ? Object.entries(packageTypes)
        .filter(([type]) => !includedPackages.includes(type))
        .flatMap(([, types]) => types)
    : Object.values(packageTypes).flat();
