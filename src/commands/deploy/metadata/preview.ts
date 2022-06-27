/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { SourceTracking } from '@salesforce/source-tracking';
import { ForceIgnore } from '@salesforce/source-deploy-retrieve';
import { buildComponentSet } from '../../../utils/deploy';
import { PreviewResult, printDeployTables, compileResults } from '../../../utils/previewOutput';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.preview');

const exclusiveFlags = ['manifest', 'source-dir', 'metadata'];

export default class DeployMetadataPreview extends SfCommand<PreviewResult> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';

  public static flags = {
    'ignore-conflicts': Flags.boolean({
      char: 'c',
      summary: messages.getMessage('flags.ignore-conflicts.summary'),
      description: messages.getMessage('flags.ignore-conflicts.description'),
      default: false,
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
    }),
  };

  // eslint-disable-next-line @typescript-eslint/require-await, class-methods-use-this
  public async run(): Promise<PreviewResult> {
    const { flags } = await this.parse(DeployMetadataPreview);

    // we'll need STL both to check conflicts and to get the list of local changes if no flags are provided
    const canSkipTracking =
      flags['ignore-conflicts'] && [flags.manifest, flags.metadata, flags['source-dir']].some((f) => f !== undefined);

    const stl = canSkipTracking
      ? undefined
      : await SourceTracking.create({
          org: flags['target-org'],
          project: this.project,
        });

    const forceIgnore = ForceIgnore.findAndCreate(this.project.getDefaultPackage().path);
    const componentSet = await buildComponentSet({ ...flags, 'target-org': flags['target-org'].getUsername() }, stl);
    const filesWithConflicts = flags['ignore-conflicts']
      ? new Set<string>()
      : new Set((await stl.getConflicts()).flatMap((conflict) => conflict.filenames.map((f) => path.resolve(f))));

    const output: PreviewResult = compileResults({
      componentSet,
      projectPath: this.project.getPath(),
      filesWithConflicts,
      forceIgnore,
    });

    if (this.jsonEnabled) {
      printDeployTables(output);
    }
    return output;
  }
}
