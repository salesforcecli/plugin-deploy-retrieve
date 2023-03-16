/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import * as chalk from 'chalk';
import { SourceTracking } from '@salesforce/source-tracking';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'delete.tracking');

export type DeleteTrackingResult = {
  clearedFiles: string[];
};

export class DeleteTracking extends SfCommand<DeleteTrackingResult> {
  public static readonly deprecateAliases = true;
  public static aliases = ['force:source:beta:tracking:clear', 'force:source:tracking:clear'];
  public static readonly summary = messages.getMessage('deleteDescription');
  public static readonly description = messages.getMessage('deleteDescription');
  public static readonly requiresProject = true;
  public static readonly examples = [];

  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    'no-prompt': Flags.boolean({
      char: 'p',
      summary: messages.getMessage('no-promptDescription'),
      aliases: ['noprompt'],
      deprecateAliases: true,
    }),
  };

  public async run(): Promise<DeleteTrackingResult> {
    const { flags } = await this.parse(DeleteTracking);

    let clearedFiles: string[] = [];
    if (flags['no-prompt'] || (await this.confirm(chalk.dim(messages.getMessage('promptMessage'))))) {
      const sourceTracking = await SourceTracking.create({
        project: this.project,
        org: flags['target-org'],
      });
      clearedFiles = await Promise.all([sourceTracking.clearLocalTracking(), sourceTracking.clearRemoteTracking()]);
      this.log('Cleared local tracking files.');
    }
    return { clearedFiles };
  }
}
