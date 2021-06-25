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
import { Deployable, Deployer, generateTableChoices } from '@salesforce/plugin-project-utils';

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
    const maxEventListeners = new Env().getNumber('SF_MAX_EVENT_LISTENERS') || 1000;
    process.setMaxListeners(maxEventListeners);
    const { flags } = await this.parse(ProjectDeploy);

    this.log('Analyzing project');

    const username = await this.promptForUsername();

    let deployers = (await this.config.runHook('project:findDeployers', { username })) as Deployer[];
    deployers = deployers.reduce((x, y) => x.concat(y), [] as Deployer[]);
    deployers = await this.selectDeployers(deployers);

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

  public async selectDeployers(deployers: Deployer[]): Promise<Deployer[]> {
    const deployables = deployers.reduce((x, y) => x.concat(y.deployables), [] as Deployable[]);
    const columns = { name: 'APP OR PACKAGE', type: 'TYPE', path: 'PATH' };
    const options = deployables.map((deployable) => ({
      name: deployable.getAppName(),
      type: deployable.getAppType(),
      path: deployable.getAppPath(),
      value: deployable,
    }));
    const responses = await prompt<Answers>([
      {
        name: 'deployables',
        message: 'Select apps and packages to deploy:',
        type: 'checkbox',
        choices: generateTableChoices<Deployable>(columns, options),
      },
    ]);

    const chosenDeployables = responses.deployables as Deployable[];
    const chosenDeployers: Map<Deployer, Deployable[]> = new Map();
    for (const deployable of chosenDeployables) {
      const parent = deployable.getParent();
      if (chosenDeployers.has(parent)) {
        const existing = chosenDeployers.get(parent) || [];
        chosenDeployers.set(parent, [...existing, deployable]);
      } else {
        chosenDeployers.set(parent, [deployable]);
      }
    }

    const final: Deployer[] = [];
    for (const [parent, children] of chosenDeployers.entries()) {
      parent.selectDeployables(children);
      final.push(parent);
    }
    return final;
  }
}
