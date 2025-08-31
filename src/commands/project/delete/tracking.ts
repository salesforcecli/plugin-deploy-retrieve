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
import { SourceTracking } from '@salesforce/source-tracking';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
  StandardColors,
} from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'delete.tracking');

export type DeleteTrackingResult = {
  clearedFiles: string[];
};

export class DeleteTracking extends SfCommand<DeleteTrackingResult> {
  public static readonly deprecateAliases = true;
  public static readonly aliases = ['force:source:tracking:clear'];
  public static readonly summary = messages.getMessage('deleteSummary');
  public static readonly description = messages.getMessage('deleteDescription');
  public static readonly requiresProject = true;
  public static readonly examples = messages.getMessages('deleteExample');

  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    'no-prompt': Flags.boolean({
      char: 'p',
      summary: messages.getMessage('flags.no-prompt.summary'),
      aliases: ['noprompt'],
      deprecateAliases: true,
    }),
  };

  public async run(): Promise<DeleteTrackingResult> {
    const { flags } = await this.parse(DeleteTracking);

    let clearedFiles: string[] = [];
    if (
      flags['no-prompt'] ||
      (await this.confirm({ message: StandardColors.info(messages.getMessage('promptMessage')) }))
    ) {
      const sourceTracking = await SourceTracking.create({
        project: this.project!,
        org: flags['target-org'],
      });
      clearedFiles = await Promise.all([sourceTracking.clearLocalTracking(), sourceTracking.clearRemoteTracking()]);
      this.logSuccess('Cleared local tracking files.');
    }
    return { clearedFiles };
  }
}
