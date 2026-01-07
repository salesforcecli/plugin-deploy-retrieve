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

export type ResetTrackingResult = {
  sourceMembersSynced: number;
  localPathsSynced: number;
};

export class ResetTracking extends SfCommand<ResetTrackingResult> {
  public static readonly deprecateAliases = true;
  public static readonly aliases = ['force:source:tracking:reset'];
  public static readonly summary = messages.getMessage('resetSummary');
  public static readonly description = messages.getMessage('resetDescription');
  public static readonly requiresProject = true;
  public static readonly examples = messages.getMessages('resetExample');

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    // eslint-disable-next-line sf-plugin/flag-min-max-default
    revision: Flags.integer({
      char: 'r',
      summary: messages.getMessage('flags.revision.summary'),
      min: 0,
    }),
    'no-prompt': Flags.boolean({
      char: 'p',
      summary: messages.getMessage('flags.no-prompt.summary'),
      aliases: ['noprompt'],
      deprecateAliases: true,
    }),
  };

  public async run(): Promise<ResetTrackingResult> {
    const { flags } = await this.parse(ResetTracking);

    if (
      flags['no-prompt'] ||
      (await this.confirm({ message: StandardColors.info(messages.getMessage('promptMessage')) }))
    ) {
      const sourceTracking = await SourceTracking.create({
        project: this.project!,
        org: flags['target-org'],
      });

      const [remoteResets, localResets] = await Promise.all([
        sourceTracking.resetRemoteTracking(flags.revision),
        sourceTracking.resetLocalTracking(),
      ]);

      this.logSuccess(`Reset local tracking files${flags.revision ? ` to revision ${flags.revision}` : ''}.`);

      return {
        sourceMembersSynced: remoteResets,
        localPathsSynced: localResets.length,
      };
    }

    return {
      sourceMembersSynced: 0,
      localPathsSynced: 0,
    };
  }
}
