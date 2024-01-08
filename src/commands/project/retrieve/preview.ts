/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { SourceTracking } from '@salesforce/source-tracking';
import { ForceIgnore } from '@salesforce/source-deploy-retrieve';
import { PreviewResult, printTables, compileResults, getConflictFiles } from '../../../utils/previewOutput.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'retrieve.metadata.preview');

export default class RetrieveMetadataPreview extends SfCommand<PreviewResult> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly aliases = ['retrieve:metadata:preview'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'ignore-conflicts': Flags.boolean({
      char: 'c',
      summary: messages.getMessage('flags.ignore-conflicts.summary'),
      description: messages.getMessage('flags.ignore-conflicts.description'),
      default: false,
    }),
    'target-org': Flags.requiredOrg({
      char: 'o',
      description: messages.getMessage('flags.target-org.description'),
      summary: messages.getMessage('flags.target-org.summary'),
      required: true,
    }),
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
      default: false,
    }),
  };

  public async run(): Promise<PreviewResult> {
    const { flags } = await this.parse(RetrieveMetadataPreview);

    const stl = await SourceTracking.create({
      org: flags['target-org'],
      project: this.project!,
      ignoreConflicts: flags['ignore-conflicts'],
    });

    const forceIgnore = ForceIgnore.findAndCreate(this.project!.getDefaultPackage().path);

    const [componentSet, filesWithConflicts, remoteDeletes] = await Promise.all([
      stl.remoteNonDeletesAsComponentSet(),
      getConflictFiles(stl, flags['ignore-conflicts']),
      stl.getChanges({ origin: 'remote', state: 'delete', format: 'SourceComponent' }),
    ]);

    const output = compileResults({
      componentSet,
      projectPath: this.project!.getPath(),
      filesWithConflicts,
      forceIgnore,
      baseOperation: 'retrieve',
      remoteDeletes,
    });

    if (!this.jsonEnabled()) {
      printTables(output, 'retrieve', flags.concise);
    }
    return output;
  }
}
