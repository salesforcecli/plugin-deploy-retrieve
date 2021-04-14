/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { Command, Flags } from '@oclif/core';
import { AnyJson } from '@salesforce/ts-types';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('@salesforce/plugin-project', 'project');

export default class ProjectDeploy extends Command {
  public static description = messages.getMessage('deploy.commandDescription');

  public static examples = messages.getMessage('deploy.examples').split(os.EOL);

  public static flags = {
    directory: Flags.string({
      description: 'directory to deploy',
    }),
    'target-env': Flags.string({
      description: 'TBD',
      multiple: true,
    }),
    interactive: Flags.boolean({
      description: 'TBD',
    }),
  };

  public async run(): Promise<AnyJson> {
    const { flags } = await this.parse(ProjectDeploy);
    this.log(JSON.stringify(flags));
    return {};
  }
}
