/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable class-methods-use-this */

import { EOL } from 'os';
import { Flags, Hook } from '@oclif/core';
import { Messages } from '@salesforce/core';
import { writeJson, pathExists, writeFile, readFile } from 'fs-extra';
import { Env, parseJsonMap } from '@salesforce/kit';
import { Deployable, Deployer, generateTableChoices, Prompter, SfCommand, SfHook } from '@salesforce/sf-plugins-core';
import { exec } from 'shelljs';
import { DeployerResult } from '@salesforce/sf-plugins-core/lib/deployer';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy');

export const DEPLOY_OPTIONS_FILE = 'deploy-options.json';

export default class Deploy extends SfCommand<void> {
  public static summary = messages.getMessage('summary');
  public static description = messages.getMessage('description');
  public static examples = messages.getMessages('examples');
  public static enableJsonFlag = false;

  public static flags = {
    interactive: Flags.boolean({
      summary: messages.getMessage('flags.interactive.summary'),
    }),
  };

  public async run(): Promise<void> {
    process.setMaxListeners(new Env().getNumber('SF_MAX_EVENT_LISTENERS') || 1000);
    const { flags } = await this.parse(Deploy);

    flags.interactive = await this.isInteractive(flags.interactive);
    const options = await this.readOptions();

    this.log(messages.getMessage('AnalyzingProject'));

    if (!flags.interactive) {
      this.log(messages.getMessage('UsingOptionsFromFile', [DEPLOY_OPTIONS_FILE]));
    }

    const hookResults = await SfHook.run(this.config, 'sf:deploy', options);

    this.checkForHookFailures(hookResults);

    let deployers = hookResults.successes.flatMap((s) => s.result);

    if (deployers.length === 0) {
      this.log(messages.getMessage('FoundNothingToDeploy'));
    } else {
      if (flags.interactive) {
        deployers = await this.selectDeployers(deployers);
      } else {
        deployers = deployers.filter((d) => !!options[d.getName()]);
      }

      if (deployers.length === 0) {
        this.log(messages.getMessage('NothingSelectedToDeploy'));
      }

      const deployOptions: Record<string, Deployer.Options> = {};
      for (const deployer of deployers) {
        const opts = options[deployer.getName()] ?? {};
        // setup must be done sequentially
        // eslint-disable-next-line no-await-in-loop
        deployOptions[deployer.getName()] = await deployer.setup(flags, opts);
      }

      if (flags.interactive && (await this.askToSave())) {
        await writeJson(DEPLOY_OPTIONS_FILE, deployOptions);
        this.log();
        this.log(messages.getMessage('DeployOptionsSavedToFile', [DEPLOY_OPTIONS_FILE]));
        if (await this.shouldCommit()) {
          await this.commit();
          this.log(messages.getMessage('DeployOptionsIncludedInGitIgnore', [DEPLOY_OPTIONS_FILE]));
        }
      }

      const deployResults: Array<[Deployer, void | DeployerResult]> = [];
      for (const deployer of deployers) {
        // deployments must be done sequentially?
        // eslint-disable-next-line no-await-in-loop
        deployResults.push([deployer, await deployer.deploy()]);
      }
      if (deployResults.some(([, result]) => !!result && result.exitCode !== 0)) {
        process.exitCode = 1;
        this.warn(messages.getMessage('DeployersHaveNonZeroExitCode'));
        deployResults
          .filter(([, result]) => !!result && result.exitCode !== 0)
          .forEach(([deployer, result]) => {
            this.log(
              messages.getMessage('DeployerExitCode', [deployer.getName(), result ? result.exitCode : 'unknown'])
            );
          });
      }
    }
  }

  /**
   * If the deploy file exists, we do not want the command to be interactive. But if the file
   * does not exist then we want to force the command to be interactive.
   */
  public async isInteractive(interactive: boolean): Promise<boolean> {
    if (interactive) return true;
    const deployFileExists = await pathExists(DEPLOY_OPTIONS_FILE);
    return deployFileExists ? false : true;
  }

  public async readOptions(): Promise<Record<string, Deployer.Options>> {
    if (await pathExists(DEPLOY_OPTIONS_FILE)) {
      return parseJsonMap<Record<string, Deployer.Options>>(await readFile(DEPLOY_OPTIONS_FILE, 'utf8'));
    } else {
      return {};
    }
  }

  public async commit(): Promise<void> {
    const gitignore = await readFile('.gitignore', 'utf-8');
    if (!gitignore.includes(DEPLOY_OPTIONS_FILE)) {
      const addition = `${EOL}${EOL}# Deploy Options${EOL}${DEPLOY_OPTIONS_FILE}${EOL}`;
      await writeFile('.gitignore', `${gitignore}${addition}`);
    }
    exec('git add .gitignore', { silent: true });
    exec(`git commit -am "Add ${DEPLOY_OPTIONS_FILE} to .gitignore"`, { silent: true });
  }

  public async shouldCommit(): Promise<boolean> {
    return (await pathExists('.git')) && (await pathExists('functions'));
  }

  public async askToSave(): Promise<boolean> {
    const prompter = new Prompter();
    const { save } = await prompter.prompt<{ save: boolean }>({
      name: 'save',
      message: 'Would you like to save these deploy options for future runs?',
      type: 'confirm',
    });
    return save;
  }

  public async selectDeployers(deployers: Deployer[]): Promise<Deployer[]> {
    const deployables: Deployable[] = deployers.reduce<Deployable[]>((x, y) => x.concat(y.deployables), []);
    const columns = { name: 'APP OR PACKAGE', type: 'TYPE', path: 'PATH' };
    const options = deployables.map((deployable) => ({
      name: deployable.getName(),
      type: deployable.getType(),
      path: deployable.getPath(),
      value: deployable,
    }));
    const prompter = new Prompter();
    const responses = await prompter.prompt<{ deployables: Deployable[] }>([
      {
        name: 'deployables',
        message: 'Select apps and packages to deploy:',
        type: 'checkbox',
        choices: generateTableChoices<Deployable>(columns, options),
      },
    ]);

    const chosenDeployers: Map<Deployer, Deployable[]> = new Map();
    for (const deployable of responses.deployables) {
      const parent = deployable.getParent();
      if (chosenDeployers.has(parent)) {
        const existing = chosenDeployers.get(parent) || [];
        chosenDeployers.set(parent, [...existing, deployable]);
      } else {
        chosenDeployers.set(parent, [deployable]);
      }
    }

    const final: Deployer[] = [];
    for (const [parent, children] of Array.from(chosenDeployers.entries())) {
      parent.selectDeployables(children);
      final.push(parent);
    }
    return final;
  }

  public checkForHookFailures(hookResults: Hook.Result<Deployer[]>): void {
    if (hookResults.failures?.length) {
      // display a table of the errors encountered; Plugin Name, Error Message
      const columns = {
        errorName: { header: 'Error Name' },
        errorMessage: { header: 'Error Message' },
      };

      const failureData = hookResults.failures.map((failure) => {
        return { errorName: failure.error.name, errorMessage: failure.error.message };
      });
      this.styledHeader(messages.getMessage('error.initialization.title'));
      this.table(failureData, columns);
      const err = messages.createError('error.initialization');
      err.data = hookResults.failures;
      throw err;
    }
  }
}
