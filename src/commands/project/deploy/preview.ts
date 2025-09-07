/*
 * Copyright 2025, Salesforce, Inc.
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

import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { SourceTracking } from '@salesforce/source-tracking';
import { ForceIgnore } from '@salesforce/source-deploy-retrieve';
import { buildComponentSet } from '../../../utils/deploy.js';
import { PreviewResult, printTables, compileResults, getConflictFiles } from '../../../utils/previewOutput.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.preview');

const exclusiveFlags = ['manifest', 'source-dir', 'metadata'];

export default class DeployMetadataPreview extends SfCommand<PreviewResult> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly aliases = ['deploy:metadata:preview'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
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
    'target-org': Flags.requiredOrg(),
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
      default: false,
    }),
  };

  public async run(): Promise<PreviewResult> {
    const { flags } = await this.parse(DeployMetadataPreview);
    const deploySpecified = [flags.manifest, flags.metadata, flags['source-dir']].some((f) => f !== undefined);
    const forceIgnore = ForceIgnore.findAndCreate(this.project!.getDefaultPackage().path);

    // we'll need STL both to check conflicts and to get the list of local changes if no flags are provided
    const stl =
      flags['ignore-conflicts'] && deploySpecified
        ? undefined
        : await SourceTracking.create({
            org: flags['target-org'],
            project: this.project!,
          });

    if (stl) {
      // This helps prevent a race condition when the status is being generated for the first time
      await stl.ensureLocalTracking();
    }

    const [componentSet, filesWithConflicts] = await Promise.all([
      buildComponentSet({ ...flags, 'target-org': flags['target-org'].getUsername() }, stl),
      getConflictFiles(stl, flags['ignore-conflicts']),
    ]);

    const output = compileResults({
      componentSet,
      projectPath: this.project!.getPath(),
      filesWithConflicts,
      forceIgnore,
      baseOperation: 'deploy',
    });

    if (!this.jsonEnabled()) {
      printTables(output, 'deploy', flags.concise);
    }
    return output;
  }
}
