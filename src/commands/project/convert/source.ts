/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { resolve } from 'path';
import * as fs from 'fs';

import { Messages } from '@salesforce/core';
import {
  ComponentSet,
  ComponentSetBuilder,
  ConvertResult,
  MetadataConverter,
} from '@salesforce/source-deploy-retrieve';
import { getString } from '@salesforce/ts-types';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { getPackageDirs, getSourceApiVersion } from '../../../utils/project';
import { SourceConvertResultFormatter } from '../../../formatters/sourceConvertResultFormatter';
import { ConvertResultJson } from '../../../utils/types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'convert.source');

export class Source extends SfCommand<ConvertResultJson> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly aliases = ['force:source:convert'];
  public static readonly deprecateAliases = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'root-dir': Flags.directory({
      aliases: ['rootdir'],
      deprecateAliases: true,
      char: 'r',
      summary: messages.getMessage('flags.root-dir.summary'),
      exists: true,
    }),
    'output-dir': Flags.directory({
      aliases: ['outputdir'],
      deprecateAliases: true,
      default: `metadataPackage_${Date.now()}`,
      char: 'd',
      summary: messages.getMessage('flags.output-dir.summary'),
    }),
    'package-name': Flags.string({
      char: 'n',
      aliases: ['packagename'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.package-name.summary'),
    }),
    manifest: Flags.file({
      char: 'x',
      summary: messages.getMessage('flags.manifest.summary'),
      description: messages.getMessage('flags.manifest.description'),
      exists: true,
    }),
    'source-dir': arrayWithDeprecation({
      char: 'p',
      aliases: ['sourcepath'],
      deprecateAliases: true,
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      exclusive: ['manifest', 'metadata'],
    }),
    metadata: arrayWithDeprecation({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      exclusive: ['manifest', 'sourcepath'],
    }),
  };

  protected convertResult!: ConvertResult;
  private flags!: Interfaces.InferredFlags<typeof Source.flags>;
  private componentSet!: ComponentSet;

  public async run(): Promise<ConvertResultJson> {
    this.flags = (await this.parse(Source)).flags;
    await this.convert();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async convert(): Promise<void> {
    const paths: string[] = [];

    const { metadata, manifest } = this.flags;
    const sourcepath = this.flags['source-dir'];
    const rootdir = this.flags['root-dir'];

    if (sourcepath) {
      paths.push(...sourcepath);
    }

    // rootdir behaves exclusively to sourcepath, metadata, and manifest... to maintain backwards compatibility
    // we will check here, instead of adding the exclusive option to the flag definition so we don't break scripts
    if (rootdir && !sourcepath && !metadata && !manifest && typeof rootdir === 'string') {
      // only rootdir option passed
      paths.push(rootdir);
    }

    // no options passed, convert the default package (usually force-app)
    if (!sourcepath && !metadata && !manifest && !rootdir) {
      paths.push(this.project.getDefaultPackage().path);
    }

    this.componentSet = await ComponentSetBuilder.build({
      sourceapiversion: await getSourceApiVersion(),
      sourcepath: paths,
      manifest: manifest
        ? {
            manifestPath: manifest,
            directoryPaths: await getPackageDirs(),
          }
        : undefined,
      metadata: metadata
        ? {
            metadataEntries: metadata,
            directoryPaths: await getPackageDirs(),
          }
        : undefined,
    });

    const packageName = this.flags['package-name'];
    const outputDirectory = resolve(this.flags['output-dir']);
    const converter = new MetadataConverter();
    this.convertResult = await converter.convert(this.componentSet, 'metadata', {
      type: 'directory',
      outputDirectory,
      packageName,
      genUniqueDir: false,
    });

    if (packageName && this.convertResult.packagePath) {
      // SDR will build an output path like /output/directory/packageName/package.xml
      // this was breaking from toolbelt, so to revert it we copy the directory up a level and delete the original
      fs.cpSync(this.convertResult.packagePath, outputDirectory);
      fs.rmSync(this.convertResult.packagePath, { recursive: true });
      this.convertResult.packagePath = outputDirectory;
    }
  }

  protected resolveSuccess(): void {
    if (!getString(this.convertResult, 'packagePath')) {
      process.exitCode = 1;
    }
  }

  protected formatResult(): ConvertResultJson {
    const formatter = new SourceConvertResultFormatter(this.convertResult);

    if (!this.jsonEnabled()) {
      formatter.display();
    }
    return formatter.getJson();
  }
}
