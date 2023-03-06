/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname, resolve } from 'path';
import * as fs from 'fs';
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
import { ConvertMdapiJson } from '../../../utils/types';
import { MetadataConvertResultFormatter } from '../../../utils/output';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.mdapi');

export interface EnsureFsFlagOptions {
  flagName: string;
  path: string;
  type: 'dir' | 'file' | 'any';
  throwOnENOENT?: boolean;
}
export class Mdapi extends SfCommand<ConvertMdapiJson> {
  public static aliases = ['force:mdapi:beta:convert', 'force:mdapi:convert'];
  public static readonly deprecateAliases = true;
  public static readonly summary = messages.getMessage('description');
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
      description: messages.getMessage('flags.root-dir'),
      summary: messages.getMessage('flagsLong.root-dir'),
      required: true,
    }),
    'output-dir': Flags.directory({
      aliases: ['outputdir'],
      deprecateAliases: true,
      char: 'd',
      description: messages.getMessage('flags.output-dir'),
      summary: messages.getMessage('flagsLong.output-dir'),
    }),
    manifest: Flags.string({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      summary: messages.getMessage('flagsLong.manifest'),
    }),
    'metadata-path': arrayWithDeprecation({
      char: 'p',
      aliases: ['metadatapath'],
      deprecateAliases: true,
      description: messages.getMessage('flags.metadata-path'),
      summary: messages.getMessage('flagsLong.metadata-path'),
      exclusive: ['manifest', 'metadata'],
    }),
    metadata: arrayWithDeprecation({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      summary: messages.getMessage('flagsLong.metadata'),
      exclusive: ['manifest', 'metadatapath'],
    }),
  };

  private flags!: Interfaces.InferredFlags<typeof Mdapi.flags>;
  private componentSet!: ComponentSet;
  private convertResult!: ConvertResult;

  public async run(): Promise<ConvertMdapiJson> {
    this.flags = (await this.parse(Mdapi)).flags;
    await this.convert();
    return this.formatResult();
  }

  protected async convert(): Promise<void> {
    this.resolveRootDir(this.flags['root-dir']);
    this.resolveOutputDir(this.flags['output-dir']);
    this.resolveMetadataPaths(this.flags['metadata-path'] as string[]);
    this.resolveManifest(this.flags.manifest);

    let paths: string[] = [];
    if (this.flags['metadata-path']) {
      paths = this.flags['metadata-path'];
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
        outputDirectory: this.flags['output-dir'] as string,
        genUniqueDir: false,
      });
      this.spinner.stop();
    }
  }

  protected formatResult(): ConvertMdapiJson {
    const formatter = new MetadataConvertResultFormatter(this.convertResult);

    if (!this.jsonEnabled()) {
      formatter.display();
    }
    return formatter.getJson();
  }

  /**
   * Ensures command flags that are file system paths are set properly before
   * continuing command execution.  Can also create directories that don't yet
   * exist in the path.
   *
   * @param options defines the path to resolve and the expectations
   * @returns the resolved flag path
   */
  // eslint-disable-next-line class-methods-use-this
  protected ensureFlagPath(options: EnsureFsFlagOptions): void {
    const { flagName, path, type, throwOnENOENT } = options;

    const trimmedPath = path?.trim();
    let resolvedPath!: string;
    if (trimmedPath?.length) {
      resolvedPath = resolve(trimmedPath);
    }

    try {
      const stats = fs.statSync(resolvedPath);
      if (type !== 'any') {
        const isDir = stats.isDirectory();
        if (type === 'dir' && !isDir) {
          const msg = messages.getMessage('expectedDirectory');
          throw messages.createError('InvalidFlagPath', [flagName, path, msg]);
        } else if (type === 'file' && isDir) {
          const msg = messages.getMessage('expectedFile');
          throw messages.createError(messages.getMessage('InvalidFlagPath', [flagName, path, msg]));
        }
      }
    } catch (error: unknown) {
      const err = error as SfError;
      if (err.code !== 'ENOENT') {
        throw err;
      } else {
        if (throwOnENOENT) {
          const enoent = messages.getMessage('notFound');
          throw new SfError(messages.getMessage('InvalidFlagPath', [flagName, path, enoent]), 'InvalidFlagPath');
        }
        const dir = type === 'dir' ? resolvedPath : dirname(resolvedPath);
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private resolveRootDir(rootDir: string): void {
    this.ensureFlagPath({
      flagName: 'rootdir',
      path: rootDir,
      type: 'dir',
      throwOnENOENT: true,
    });
  }

  private resolveOutputDir(outputDir?: string): void {
    this.ensureFlagPath({
      flagName: 'outputdir',
      path: outputDir ?? this.project.getDefaultPackage().path,
      type: 'dir',
    });
  }

  private resolveManifest(manifestPath?: string): void {
    if (manifestPath?.length) {
      this.ensureFlagPath({
        flagName: 'manifest',
        path: manifestPath,
        type: 'file',
        throwOnENOENT: true,
      });
    }
  }

  private resolveMetadataPaths(metadataPaths: string[]): void {
    if (metadataPaths?.length) {
      metadataPaths.forEach((mdPath) => {
        if (mdPath?.length) {
          this.ensureFlagPath({
            flagName: 'metadatapath',
            path: mdPath,
            type: 'any',
            throwOnENOENT: true,
          });
        }
      });
    }
  }
}
