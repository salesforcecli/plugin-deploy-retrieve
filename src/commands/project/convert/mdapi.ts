/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname, resolve } from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Messages, SfError } from '@salesforce/core';
import {
  ComponentSet,
  ComponentSetBuilder,
  ConvertResult,
  MetadataConverter,
} from '@salesforce/source-deploy-retrieve';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { ConvertMdapiJson } from '../../../utils/types.js';
import { MetadataConvertResultFormatter } from '../../../formatters/metadataConvertResultFormatter.js';

Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.mdapi');

export interface EnsureFsFlagOptions {
  flagName: string;
  path: string;
  type: 'dir' | 'file' | 'any';
  throwOnENOENT?: boolean;
}
export class Mdapi extends SfCommand<ConvertMdapiJson> {
  public static readonly aliases = ['force:mdapi:convert'];
  public static readonly deprecateAliases = true;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'root-dir': Flags.directory({
      aliases: ['rootdir'],
      deprecateAliases: true,
      char: 'r',
      summary: messages.getMessage('flags.root-dir.summary'),
      required: true,
      exists: true,
    }),
    'output-dir': Flags.directory({
      aliases: ['outputdir'],
      deprecateAliases: true,
      char: 'd',
      summary: messages.getMessage('flags.output-dir.summary'),
    }),
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exists: true,
    }),
    'metadata-dir': arrayWithDeprecation({
      char: 'p',
      aliases: ['metadatapath'],
      deprecateAliases: true,
      description: messages.getMessage('flags.metadata-dir.description'),
      summary: messages.getMessage('flags.metadata-dir.summary'),
      exclusive: ['manifest', 'metadata'],
    }),
    metadata: arrayWithDeprecation({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      exclusive: ['manifest', 'metadatapath'],
    }),
  };

  private flags!: Interfaces.InferredFlags<typeof Mdapi.flags>;
  private componentSet?: ComponentSet;
  private convertResult?: ConvertResult;

  public async run(): Promise<ConvertMdapiJson> {
    this.flags = (await this.parse(Mdapi)).flags;
    await this.convert();
    return this.formatResult();
  }

  protected async convert(): Promise<void> {
    const [outputDir] = await Promise.all([
      resolveOutputDir(this.flags['output-dir'] ?? this.project.getDefaultPackage().path),
      resolveMetadataPaths(this.flags['metadata-dir'] ?? []),
    ]);

    let paths: string[] = [];
    if (this.flags['metadata-dir']) {
      paths = this.flags['metadata-dir'];
    } else if (!this.flags.manifest && !this.flags.metadata) {
      paths = [this.flags['root-dir']];
    }

    this.componentSet = await ComponentSetBuilder.build({
      sourcepath: paths,
      manifest: this.flags.manifest
        ? {
            manifestPath: this.flags.manifest,
            directoryPaths: [this.flags['root-dir']],
          }
        : undefined,
      metadata: this.flags.metadata
        ? {
            metadataEntries: this.flags.metadata,
            directoryPaths: [this.flags['root-dir']],
          }
        : undefined,
    });

    const numOfComponents = this.componentSet.getSourceComponents().toArray().length;
    if (numOfComponents > 0) {
      this.spinner.start(`Converting ${numOfComponents} metadata components`);

      const converter = new MetadataConverter();
      this.convertResult = await converter.convert(this.componentSet, 'source', {
        type: 'directory',
        outputDirectory: outputDir,
        genUniqueDir: false,
      });
      this.spinner.stop();
    }
  }

  protected async formatResult(): Promise<ConvertMdapiJson> {
    if (!this.convertResult) {
      throw new SfError('No results to format');
    }
    const formatter = new MetadataConvertResultFormatter(this.convertResult);

    if (!this.jsonEnabled()) {
      await formatter.display();
    }
    return formatter.getJson();
  }
}

const resolveOutputDir = async (outputDir: string): Promise<string> =>
  ensureFlagPath({
    flagName: 'outputdir',
    path: outputDir,
    type: 'dir',
  });

const resolveMetadataPaths = async (metadataPaths: string[]): Promise<string[]> =>
  Promise.all(
    metadataPaths
      .filter((mdPath) => mdPath?.length)
      .map((mdPath) =>
        ensureFlagPath({
          flagName: 'metadatapath',
          path: mdPath,
          type: 'any',
          throwOnENOENT: true,
        })
      )
  );
/**
 * Ensures command flags that are file system paths are set properly before
 * continuing command execution.  Can also create directories that don't yet
 * exist in the path.
 *
 * @param options defines the path to resolve and the expectations
 * @returns the resolved flag path
 */
const ensureFlagPath = async (options: EnsureFsFlagOptions): Promise<string> => {
  const { flagName, path, type, throwOnENOENT } = options;
  const resolvedPath = resolve(path?.trim());

  try {
    const stats = await fs.promises.stat(resolvedPath);
    if (type !== 'any') {
      const isDir = stats.isDirectory();
      if (type === 'dir' && !isDir) {
        throw messages.createError('InvalidFlagPath', [flagName, path, messages.getMessage('expectedDirectory')]);
      } else if (type === 'file' && isDir) {
        throw messages.createError(
          messages.getMessage('InvalidFlagPath', [flagName, path, messages.getMessage('expectedFile')])
        );
      }
    }
    return resolvedPath;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      throw error;
    } else {
      if (throwOnENOENT) {
        const enoent = messages.getMessage('notFound');
        throw new SfError(messages.getMessage('InvalidFlagPath', [flagName, path, enoent]), 'InvalidFlagPath');
      }
      const dir = type === 'dir' ? resolvedPath : dirname(resolvedPath);
      // using as because fs promises always returns a string when recursive is true
      return fs.promises.mkdir(dir, { recursive: true }) as Promise<string>;
    }
  }
};
