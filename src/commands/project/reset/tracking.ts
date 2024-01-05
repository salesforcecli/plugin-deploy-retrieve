/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
