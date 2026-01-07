/*
 * Copyright 2026, Salesforce, Inc.
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
import { join } from 'node:path';
import * as fs from 'node:fs';

import { Messages, Org } from '@salesforce/core';
import { ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import { getPackageDirs, getSourceApiVersion } from '../../../utils/project.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'manifest.generate');

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

export type ManifestGenerateCommandResult = {
  name: string;
  path: string;
};

const atLeastOneOfFlags = ['metadata', 'source-dir', 'from-org'];

export class ManifestGenerate extends SfCommand<ManifestGenerateCommandResult> {
  public static readonly summary = messages.getMessage('summary');
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
      summary: messages.getMessage('flags.metadata.summary'),
    }),
    'source-dir': arrayWithDeprecation({
      char: 'p',
      aliases: ['sourcepath'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.source-dir.summary'),
    }),
    name: Flags.string({
      char: 'n',
      aliases: ['manifestname'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.name.summary'),
      exclusive: ['type'],
    }),
    type: Flags.string({
      aliases: ['manifesttype'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.type.summary'),
      options: Object.keys(manifestTypes),
      char: 't',
      exclusive: ['name'],
    }),
    'include-packages': arrayWithDeprecation({
      aliases: ['includepackages'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.include-packages.summary'),
      options: Object.keys(packageTypes),
      char: 'c',
      dependsOn: ['from-org'],
    }),
    'excluded-metadata': Flags.string({
      multiple: true,
      delimiter: ',',
      summary: messages.getMessage('flags.excluded-metadata.summary'),
      relationships: [{ type: 'some', flags: ['from-org', 'source-dir'] }],
    }),
    'from-org': Flags.custom({
      summary: messages.getMessage('flags.from-org.summary'),
      aliases: ['fromorg'],
      deprecateAliases: true,
      exclusive: ['source-dir'],
      parse: async (input: string | undefined) => (input ? Org.create({ aliasOrUsername: input }) : undefined),
    })(),
    'output-dir': Flags.string({
      char: 'd',
      aliases: ['outputdir', 'o'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.output-dir.summary'),
    }),
  };

  public async run(): Promise<ManifestGenerateCommandResult> {
    const { flags } = await this.parse(ManifestGenerate);

    // We need at least one of these flags (but could be more than 1): 'metadata', 'source-dir', 'from-org'
    if (!Object.keys(flags).some((f) => atLeastOneOfFlags.includes(f))) {
      throw Error(`provided flags must include at least one of: ${atLeastOneOfFlags.toString()}`);
    }

    // convert the manifesttype into one of the "official" manifest names
    // if no manifesttype flag passed, use the manifestname?flag
    // if no manifestname flag, default to 'package.xml'
    const manifestTypeFromFlag = flags.type as keyof typeof manifestTypes;
    const manifestName = ensureFileEnding(
      typeof manifestTypeFromFlag === 'string' ? manifestTypes[manifestTypeFromFlag] : flags.name ?? 'package.xml',
      '.xml'
    );

    const componentSet = await ComponentSetBuilder.build({
      apiversion: flags['api-version'] ?? (await getSourceApiVersion()),
      sourcepath: flags['source-dir'],
      metadata:
        flags.metadata ?? flags['excluded-metadata']
          ? {
              metadataEntries: flags.metadata ?? [],
              directoryPaths: await getPackageDirs(),
              excludedEntries: flags['excluded-metadata'],
            }
          : undefined,
      org: flags['from-org']
        ? {
            username: flags['from-org'].getUsername() as string,
            exclude: exclude(flags['include-packages']),
          }
        : undefined,
      projectDir: this.project?.getPath(),
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
