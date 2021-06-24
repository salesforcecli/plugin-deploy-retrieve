/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { prompt, Answers } from 'inquirer';
import { Command, Flags } from '@oclif/core';
import { Aliases, Config, ConfigAggregator, Messages } from '@salesforce/core';
import { Env } from '@salesforce/kit';
import { ensureString } from '@salesforce/ts-types';
import { Deployer, generateTableChoices } from '@salesforce/plugin-project-utils';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('@salesforce/plugin-project', 'project.deploy');

export type DeployResult = Record<string, unknown>;

export default class ProjectDeploy extends Command {
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');
  public static disableJsonFlag = true;

  public static flags = {
    interactive: Flags.boolean({
      summary: messages.getMessage('flags.interactive.summary'),
      default: true,
    }),
  };

  public async run(): Promise<DeployResult> {
    const maxEventListeners = new Env().getNumber('SF_MAX_EVENT_LISTENERS') || 0;
    process.setMaxListeners(maxEventListeners || 1000);
    const { flags } = await this.parse(ProjectDeploy);

    this.log('Analyzing project');

    const username = await this.promptForUsername();

    let deployers: Set<Deployer> = new Set();
    await this.config.runHook('project:findDeployers', { deployers, username });

    deployers = await this.promptUserToChoseDeployers(deployers);

    await this.config.runHook('project:mergeDeployers', { deployers, username });

    for (const deployer of deployers) {
      await deployer.setup(flags);
      await deployer.deploy();
    }
    return {};
  }

  public async promptForUsername(): Promise<string> {
    const aliasOrUsername = ConfigAggregator.getValue(Config.DEFAULT_USERNAME)?.value as string;

    if (!aliasOrUsername) {
      const { username } = await prompt<Answers>([
        {
          name: 'username',
          message: 'Enter the target org for this deploy:',
          type: 'input',
        },
      ]);
      return ensureString(username);
    } else {
      return (await Aliases.fetch(aliasOrUsername)) || aliasOrUsername;
    }
  }

  public async promptUserToChoseDeployers(deployers: Set<Deployer>): Promise<Set<Deployer>> {
    const columns = {
      name: 'APP OR PACKAGE',
      type: 'TYPE',
      path: 'PATH',
    };
    const options = Array.from(deployers).map((deployer) => ({
      name: deployer.getAppName(),
      type: deployer.getAppType(),
      path: deployer.getAppPath(),
      value: deployer,
    }));
    const responses = await prompt<Answers>([
      {
        name: 'chooseApps',
        message: 'Select apps and packages to deploy:',
        type: 'checkbox',
        choices: generateTableChoices<Deployer>(columns, options),
      },
    ]);

    return new Set(responses.chooseApps as Deployer[]);
  }
}
