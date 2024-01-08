/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'node:path';
import fs from 'node:fs';

import { Messages, SfError } from '@salesforce/core';
import { ForceIgnore } from '@salesforce/source-deploy-retrieve';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'list.ignored');

export type SourceIgnoredResults = {
  ignoredFiles: string[];
};

export class Ignored extends SfCommand<SourceIgnoredResults> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly aliases = ['force:source:ignored:list'];
  public static readonly deprecateAliases = true;
  public static readonly flags = {
    'source-dir': Flags.file({
      char: 'p',
      aliases: ['sourcepath'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.source-dir.summary'),
    }),
  };

  private forceIgnore!: ForceIgnore;
  /**
   * Outputs all forceignored files from package directories of a project,
   * or based on a sourcepath param that points to a specific file or directory.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async run(): Promise<SourceIgnoredResults> {
    const flags = (await this.parse(Ignored)).flags;
    try {
      this.forceIgnore = ForceIgnore.findAndCreate(this.project!.getPath());
      const sourcepaths = flags['source-dir']
        ? [flags['source-dir']]
        : this.project!.getUniquePackageDirectories().map((pDir) => pDir.path);

      const ignoredFiles = (await Promise.all(sourcepaths.map((sp) => this.statIgnored(sp.trim())))).flat();

      // Command output
      if (ignoredFiles.length) {
        this.log('Found the following ignored files:');
        ignoredFiles.forEach((filepath) => this.log(filepath));
      } else {
        this.log('No ignored files found in paths:');
        sourcepaths.forEach((sp) => this.log(sp));
      }

      return { ignoredFiles };
    } catch (err) {
      const error = err as Error;
      if ('code' in error && error.code === 'ENOENT') {
        throw messages.createError('invalidSourceDir', [flags['source-dir']]);
      }
      throw SfError.wrap(error);
    }
  }

  // Stat the filepath.  Test if a file, recurse if a directory.
  private async statIgnored(filepath: string): Promise<string[]> {
    const stats = await fs.promises.stat(filepath);
    if (stats.isDirectory()) {
      return (await Promise.all(await this.findIgnored(filepath))).flat();
    } else {
      return this.isIgnored(filepath) ? [filepath] : [];
    }
  }

  // Recursively search a directory for source files to test.
  private async findIgnored(dir: string): Promise<Array<Promise<string[]>>> {
    return (await fs.promises.readdir(dir)).map((filename) => this.statIgnored(join(dir, filename)));
  }

  // Test if a source file is denied, adding any ignored files to
  // the ignoredFiles array for output.
  private isIgnored(filepath: string): boolean {
    return this.forceIgnore.denies(filepath);
  }
}
