/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Flags } from '@oclif/core';
import {
  EnvironmentVariable,
  Messages,
  OrgConfigProperties,
  SfdxPropertyKeys,
  SfdxProject,
  SfdxError,
} from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { FileResponse, RetrieveResult } from '@sf/sdr';

import { SfCommand, toHelpSection } from '@salesforce/sf-plugins-core';
import { getArray, getBoolean, getString } from '@salesforce/ts-types';
import { getPackageDirs, resolveTargetOrg } from '../../utils/orgs';
import { ComponentSetBuilder, ManifestOption } from '../../utils/componentSetBuilder';
import { displayPackages, displaySuccesses, PackageRetrieval } from '../../utils/output';
import { validateOneOfCommandFlags } from '../../utils/requiredFlagValidator';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'retrieve.metadata');
const mdTrasferMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'metadata.transfer');

// One of these flags must be specified for a valid deploy.
const requiredFlags = ['manifest', 'metadata', 'package-name', 'source-dir'];

export type RetrieveMetadataResult = FileResponse[];

export default class RetrieveMetadata extends SfCommand<RetrieveMetadataResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static flags = {
    'api-version': Flags.string({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
    manifest: Flags.string({
      char: 'x',
      summary: messages.getMessage('flags.manifest.summary'),
      description: messages.getMessage('flags.manifest.description'),
      exclusive: ['metadata', 'source-dir'],
    }),
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exclusive: ['manifest', 'source-dir'],
    }),
    'package-name': Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.package-name.summary'),
      multiple: true,
    }),
    'source-dir': Flags.string({
      char: 'd',
      summary: messages.getMessage('flags.source-dir.summary'),
      description: messages.getMessage('flags.source-dir.description'),
      multiple: true,
      exclusive: ['manifest', 'metadata'],
    }),
    'target-org': Flags.string({
      char: 'o',
      summary: messages.getMessage('flags.target-org.summary'),
      description: messages.getMessage('flags.target-org.description'),
    }),
    wait: Flags.integer({
      char: 'w',
      default: 33,
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
    }),
  };

  public static configurationVariablesSection = toHelpSection(
    'CONFIGURATION VARIABLES',
    OrgConfigProperties.TARGET_ORG,
    SfdxPropertyKeys.API_VERSION
  );
  public static envVariablesSection = toHelpSection(
    'ENVIRONMENT VARIABLES',
    EnvironmentVariable.SF_TARGET_ORG,
    EnvironmentVariable.SFDX_DEFAULTUSERNAME,
    EnvironmentVariable.SFDX_USE_PROGRESS_BAR
  );

  protected retrieveResult!: RetrieveResult;

  public async run(): Promise<RetrieveMetadataResult> {
    const flags = (await this.parse(RetrieveMetadata)).flags;

    validateOneOfCommandFlags(requiredFlags, flags);

    const componentSet = await ComponentSetBuilder.build({
      apiversion: flags['api-version'],
      sourcepath: flags['source-dir'],
      packagenames: flags['package-name'],
      manifest: (flags.manifest && {
        manifestPath: flags.manifest,
        directoryPaths: await getPackageDirs(),
      }) as ManifestOption,
      metadata: flags.metadata && {
        metadataEntries: flags.metadata,
        directoryPaths: await getPackageDirs(),
      },
    });

    const project = await SfdxProject.resolve();

    const retrieve = await componentSet.retrieve({
      usernameOrConnection: await resolveTargetOrg(flags['target-org']),
      merge: true,
      output: project.getDefaultPackage().fullPath,
      packageOptions: flags['package-name'],
    });

    retrieve.onUpdate((data) => {
      this.spinner.status = mdTrasferMessages.getMessage(data.status);
    });

    // any thing else should stop the progress bar
    retrieve.onFinish((data) => this.spinner.stop(mdTrasferMessages.getMessage(data.response.status)));

    retrieve.onCancel((data) => this.spinner.stop(mdTrasferMessages.getMessage(data.status)));

    retrieve.onError((error: Error) => {
      this.spinner.stop(error.name);
      throw error;
    });

    this.spinner.start(messages.getMessage('RetrieveTitle'));

    await retrieve.start();
    const result = await retrieve.pollStatus(500, Duration.minutes(flags.wait).seconds);

    const fileResponses = result?.getFileResponses() || [];

    await this.displayResults(result, flags);

    return fileResponses;
  }
  private async displayResults(result: RetrieveResult, flags): Promise<void> {
    if (!getBoolean(flags, 'json', false)) {
      if (result.response.status === 'Succeeded') {
        displaySuccesses(result);
        displayPackages(result, await this.getPackages(result, flags));
      } else {
        throw new SfdxError(
          getString(result.response, 'errorMessage', result.response.status),
          getString(result.response, 'errorStatusCode', 'unknown')
        );
      }
    }
  }

  private async getPackages(result: RetrieveResult, flags): Promise<PackageRetrieval[]> {
    const packages: PackageRetrieval[] = [];
    const projectPath = await SfdxProject.resolveProjectPath();
    const packageNames = getArray(flags, 'package-name', []) as string[];
    packageNames.forEach((name) => {
      packages.push({ name, path: path.join(projectPath, name) });
    });
    return packages;
  }
}
