/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EOL } from 'os';
import { cyan } from 'chalk';
import { Duration } from '@salesforce/kit';
import {
  AuthInfo,
  ConfigAggregator,
  GlobalInfo,
  Messages,
  NamedPackageDir,
  OrgAuthorization,
  OrgConfigProperties,
} from '@salesforce/core';
import { Deployable, Deployer, generateTableChoices } from '@salesforce/sf-plugins-core';

import { ComponentSetBuilder } from './componentSetBuilder';
import { displayFailures, displaySuccesses, displayTestResults } from './output';
import { TestLevel } from './testLevel';
import { DeployProgress } from './progressBar';
import { resolveRestDeploy } from './config';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

type OrgAuthWithTimestamp = OrgAuthorization & { timestamp: Date };

const compareOrgs = (a: OrgAuthWithTimestamp, b: OrgAuthWithTimestamp): number => {
  // scratch orgs before other orgs
  if (a.isScratchOrg && !b.isScratchOrg) {
    // all scratch orgs come before non-scratch orgs
    return -1;
  } else {
    // sort scratch orgs by timestamp - descending
    if (a.isScratchOrg && b.isScratchOrg) {
      const aTimestamp = new Date(a.timestamp);
      const bTimestamp = new Date(b.timestamp);
      return bTimestamp.getTime() - aTimestamp.getTime();
    }
    // dev hubs after scratch but before remaining orgs
    if (a.isDevHub && !b.isScratchOrg && !b.isDevHub) {
      return -1;
    }
    // not a scratch org and not a devhub means "other" sorts last
    if (!a.isDevHub) {
      return 1;
    }
  }
  // orgs are equal by type - sort by name ascending
  return a.username.localeCompare(b.username);
};

export interface MetadataDeployOptions extends Deployer.Options {
  testLevel?: TestLevel;
  username?: string;
  directories?: string[];
}

export class DeployablePackage extends Deployable {
  public constructor(public pkg: NamedPackageDir, private parent: Deployer) {
    super();
  }

  public getName(): string {
    return this.pkg.name;
  }

  public getType(): string {
    return 'Salesforce App';
  }

  public getPath(): string {
    return this.pkg.path;
  }

  public getParent(): Deployer {
    return this.parent;
  }
}

export class MetadataDeployer extends Deployer {
  public static NAME = 'Salesforce Apps';

  public declare deployables: DeployablePackage[];
  private testLevel = TestLevel.NoTestRun;
  private username!: string;

  public constructor(private packages: NamedPackageDir[]) {
    super();
    this.deployables = this.packages.map((pkg) => new DeployablePackage(pkg, this));
  }

  public getName(): string {
    return MetadataDeployer.NAME;
  }

  public async setup(flags: Deployer.Flags, options: MetadataDeployOptions): Promise<MetadataDeployOptions> {
    if (flags.interactive) {
      this.testLevel = await this.promptForTestLevel();
      this.username = await this.promptForUsername();
    } else {
      if (options.directories?.length) {
        const directories = options.directories || [];
        const selected = this.deployables.filter((d) => directories.includes(d.getPath()));
        this.selectDeployables(selected);
      }
      this.testLevel = options.testLevel || (await this.promptForTestLevel());
      this.username = options.username || (await this.promptForUsername());
    }

    return {
      testLevel: this.testLevel,
      username: this.username,
      apps: this.deployables.map((d) => d.getPath()),
    };
  }

  public async deploy(): Promise<void> {
    const directories = this.deployables.map((d) => d.pkg.fullPath);
    const name = this.deployables.map((p) => cyan.bold(p.getPath())).join(', ');
    this.log(`${EOL}Deploying ${name} to ${this.username} using ${resolveRestDeploy()} API`);
    const componentSet = await ComponentSetBuilder.build({ sourcepath: directories });
    const deploy = await componentSet.deploy({
      usernameOrConnection: this.username,
      apiOptions: { testLevel: this.testLevel },
    });

    new DeployProgress(deploy).start();

    const result = await deploy.pollStatus(500, Duration.minutes(33).seconds);
    displaySuccesses(result);
    displayFailures(result);
    displayTestResults(result, this.testLevel);
  }

  public async promptForUsername(): Promise<string> {
    const aliasOrUsername = ConfigAggregator.getValue(OrgConfigProperties.TARGET_ORG)?.value as string;
    const globalInfo = await GlobalInfo.getInstance();
    const allAliases = globalInfo.aliases.getAll();
    if (!aliasOrUsername) {
      const authorizations = (
        await AuthInfo.listAllAuthorizations((orgAuth) => !orgAuth.error && orgAuth.isExpired !== true)
      ).map((orgAuth) => {
        const org = globalInfo.orgs.get(orgAuth.username);
        const timestamp = org.timestamp ? new Date(org.timestamp as string) : new Date();
        return { ...orgAuth, timestamp } as OrgAuthWithTimestamp;
      });
      if (authorizations.length > 0) {
        const newestAuths = authorizations.sort(compareOrgs);
        const options = newestAuths.map((auth) => ({
          name: auth.username,
          aliases: Object.entries(allAliases)
            .filter(([, usernameOrAlias]) => usernameOrAlias === auth.username)
            .map(([alias]) => alias)
            .join(', '),
          isScratchOrg: auth.isScratchOrg ? 'Yes' : 'No',
          value: auth.username,
        }));
        const columns = { name: 'Org', aliases: 'Aliases', isScratchOrg: 'Scratch Org' };
        const { username } = await this.prompt<{ username: string }>([
          {
            name: 'username',
            message: 'Select the org you want to deploy to:',
            type: 'list',
            choices: generateTableChoices(columns, options, false),
          },
        ]);
        return username;
      } else {
        throw messages.createError('errors.NoOrgsToSelect');
      }
    } else {
      return globalInfo.aliases.resolveUsername(aliasOrUsername);
    }
  }

  public async promptForTestLevel(): Promise<TestLevel> {
    const { testLevel } = await this.prompt<{ testLevel: string }>([
      {
        name: 'testLevel',
        message: 'Select the test level you would like to run:',
        type: 'list',
        loop: false,
        pageSize: 4,
        choices: [
          { name: "Don't run tests", value: TestLevel.NoTestRun, short: "Don't run tests" },
          { name: 'Run local tests', value: TestLevel.RunLocalTests, short: 'Run local tests' },
          {
            name: 'Run all tests in environment',
            value: TestLevel.RunAllTestsInOrg,
            short: 'Run all tests in environment',
          },
        ],
      },
    ]);
    return testLevel as TestLevel;
  }
}
