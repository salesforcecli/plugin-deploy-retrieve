/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { SourceTracking } from '@salesforce/source-tracking';
import { ForceIgnore, MetadataResolver, NodeFSTreeContainer, RegistryAccess } from '@salesforce/source-deploy-retrieve';
import { buildComponentSet } from '../../../utils/deploy';
import {
  PreviewResult,
  printTables,
  compileResults,
  getConflictFiles,
  printIgnoredTable,
  PreviewFile,
} from '../../../utils/previewOutput';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.preview');

const exclusiveFlags = ['manifest', 'source-dir', 'metadata'];

export default class DeployMetadataPreview extends SfCommand<PreviewResult> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';
  public static readonly aliases = ['deploy:metadata:preview'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'ignore-conflicts': Flags.boolean({
      char: 'c',
      summary: messages.getMessage('flags.ignore-conflicts.summary'),
      description: messages.getMessage('flags.ignore-conflicts.description'),
      default: false,
    }),
    'only-ignored': Flags.boolean({
      char: 'i',
      summary: messages.getMessage('flags.only-ignored.summary'),
      exclusive: ['manifest', 'metadata', 'ignore-conflicts'],
    }),
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exclusive: exclusiveFlags.filter((f) => f !== 'manifest'),
      exists: true,
    }),
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exclusive: exclusiveFlags.filter((f) => f !== 'metadata'),
    }),
    'source-dir': Flags.string({
      char: 'd',
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      multiple: true,
      exclusive: exclusiveFlags.filter((f) => f !== 'source-dir'),
    }),
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: messages.getMessage('flags.target-org.description'),
      summary: messages.getMessage('flags.target-org.summary'),
      required: true,
    }),
  };

  public forceIgnore!: ForceIgnore;

  public async run(): Promise<PreviewResult> {
    const { flags } = await this.parse(DeployMetadataPreview);
    const deploySpecified = [flags.manifest, flags.metadata, flags['source-dir']].some((f) => f !== undefined);
    const defaultPackagePath = this.project.getDefaultPackage().path;
    this.forceIgnore = ForceIgnore.findAndCreate(defaultPackagePath);

    if (flags['only-ignored']) {
      return this.calculateAndPrintForceIgnoredFiles({ sourceDir: flags['source-dir'], defaultPackagePath });
    }

    // we'll need STL both to check conflicts and to get the list of local changes if no flags are provided
    const stl =
      flags['ignore-conflicts'] && deploySpecified
        ? undefined
        : await SourceTracking.create({
            org: flags['target-org'],
            project: this.project,
          });

    const [componentSet, filesWithConflicts] = await Promise.all([
      buildComponentSet({ ...flags, 'target-org': flags['target-org'].getUsername() }, stl),
      getConflictFiles(stl, flags['ignore-conflicts']),
    ]);

    const output = compileResults({
      componentSet,
      projectPath: this.project.getPath(),
      filesWithConflicts,
      forceIgnore: this.forceIgnore,
      baseOperation: 'deploy',
    });

    if (!this.jsonEnabled()) {
      printTables(output, 'deploy');
    }
    return output;
  }

  private async calculateAndPrintForceIgnoredFiles(options: {
    sourceDir?: string[];
    defaultPackagePath: string;
  }): Promise<PreviewResult> {
    // the third parameter makes the resolver use the default ForceIgnore entries, which will allow us to .getComponentsFromPath of a .forceignored path
    const mdr = new MetadataResolver(new RegistryAccess(), new NodeFSTreeContainer(), false);

    const ignoredFiles: PreviewFile[] = (
      await Promise.all((options.sourceDir ?? [options.defaultPackagePath]).map((sp) => this.statIgnored(sp.trim())))
    )
      .flat()
      .map((entry) => {
        try {
          const component = mdr.getComponentsFromPath(path.resolve(entry))[0];
          return {
            projectRelativePath: entry,
            fullName: component?.fullName,
            type: component?.type.name,
            ignored: true,
            conflict: false,
          };
        } catch (e) {
          // some file paths, such as aura/.eslintrc.json will cause issues when getComponentsFromPath(), so catch the error and continue without type information
          return { projectRelativePath: entry, ignored: true, conflict: false } as PreviewFile;
        }
      });
    if (!this.jsonEnabled()) printIgnoredTable(ignoredFiles, 'deploy');
    return { ignored: ignoredFiles, conflicts: [], toDeploy: [], toDelete: [], toRetrieve: [] };
  }

  // Stat the filepath. Test if a file, recurse if a directory.
  private async statIgnored(filepath: string): Promise<string[]> {
    const stats = await fs.promises.stat(filepath);
    if (stats.isDirectory()) {
      return (await Promise.all(await this.findIgnored(filepath))).flat();
    } else {
      return this.forceIgnore.denies(filepath) ? [filepath] : [];
    }
  }

  // Recursively search a directory for source files to test.
  private async findIgnored(dir: string): Promise<Array<Promise<string[]>>> {
    return (await fs.promises.readdir(dir)).map((filename) => this.statIgnored(path.join(dir, filename)));
  }
}
