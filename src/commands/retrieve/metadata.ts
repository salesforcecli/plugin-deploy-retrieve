/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { rm } from 'fs/promises';
import { join, resolve } from 'path';

import { EnvironmentVariable, Messages, OrgConfigProperties, SfError } from '@salesforce/core';
import { RetrieveResult, ComponentSetBuilder, RetrieveSetOptions } from '@salesforce/source-deploy-retrieve';

import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { getString } from '@salesforce/ts-types';
import { SourceTracking, SourceConflictError } from '@salesforce/source-tracking';
import { ensuredDirFlag, zipFileFlag } from '../../utils/flags';
import { MetadataRetrieveResultFormatter, RetrieveResultFormatter } from '../../utils/output';
import { getPackageDirs } from '../../utils/project';
import { RetrieveResultJson } from '../../utils/types';
import { writeConflictTable } from '../../utils/conflicts';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'retrieve.metadata');
const mdTransferMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'metadata.transfer');

export default class RetrieveMetadata extends SfCommand<RetrieveResultJson> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'beta';

  public static flags = {
    'api-version': Flags.orgApiVersion({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
    'ignore-conflicts': Flags.boolean({
      char: 'c',
      summary: messages.getMessage('flags.ignore-conflicts.summary'),
      description: messages.getMessage('flags.ignore-conflicts.description'),
      default: false,
    }),
    manifest: Flags.file({
      char: 'x',
      summary: messages.getMessage('flags.manifest.summary'),
      description: messages.getMessage('flags.manifest.description'),
      exclusive: ['metadata', 'source-dir'],
      exists: true,
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
    'single-package': Flags.boolean({
      summary: messages.getMessage('flags.single-package.summary'),
      dependsOn: ['target-metadata-dir'],
      exclusive: ['ignore-conflicts'],
    }),
    'source-dir': Flags.string({
      char: 'd',
      summary: messages.getMessage('flags.source-dir.summary'),
      description: messages.getMessage('flags.source-dir.description'),
      multiple: true,
      exclusive: ['manifest', 'metadata'],
    }),
    'target-metadata-dir': ensuredDirFlag({
      char: 't',
      summary: messages.getMessage('flags.target-metadata-dir.summary'),
      relationships: [
        {
          type: 'some',
          flags: ['manifest', 'metadata', 'source-dir', 'package-name'],
        },
      ],
      exclusive: ['ignore-conflicts'],
    }),
    'target-org': Flags.requiredOrg({
      char: 'o',
      summary: messages.getMessage('flags.target-org.summary'),
      description: messages.getMessage('flags.target-org.description'),
    }),
    wait: Flags.duration({
      char: 'w',
      defaultValue: 33,
      unit: 'minutes',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
    }),
    unzip: Flags.boolean({
      char: 'z',
      summary: messages.getMessage('flags.unzip.summary'),
      dependsOn: ['target-metadata-dir'],
      exclusive: ['ignore-conflicts'],
    }),
    'zip-file-name': zipFileFlag({
      summary: messages.getMessage('flags.zip-file-name.summary'),
      dependsOn: ['target-metadata-dir'],
      exclusive: ['ignore-conflicts'],
    }),
  };

  public static configurationVariablesSection = toHelpSection(
    'CONFIGURATION VARIABLES',
    OrgConfigProperties.TARGET_ORG,
    OrgConfigProperties.ORG_API_VERSION
  );
  public static envVariablesSection = toHelpSection(
    'ENVIRONMENT VARIABLES',
    EnvironmentVariable.SF_TARGET_ORG,
    EnvironmentVariable.SF_USE_PROGRESS_BAR
  );

  protected retrieveResult!: RetrieveResult;

  public async run(): Promise<RetrieveResultJson> {
    const { flags } = await this.parse(RetrieveMetadata);

    this.spinner.start(messages.getMessage('spinner.start'));
    const format = flags['target-metadata-dir'] ? 'metadata' : 'source';
    const stl = await SourceTracking.create({
      org: flags['target-org'],
      project: this.project,
      subscribeSDREvents: true,
      ignoreConflicts: format === 'metadata' || flags['ignore-conflicts'],
    });
    const isChanges = !flags['source-dir'] && !flags['manifest'] && !flags['metadata'];
    const { componentSetFromNonDeletes, fileResponsesFromDelete } = isChanges
      ? await stl.maybeApplyRemoteDeletesToLocal(true)
      : {
          componentSetFromNonDeletes: await ComponentSetBuilder.build({
            apiversion: flags['api-version'],
            sourcepath: flags['source-dir'],
            packagenames: flags['package-name'],
            manifest: flags.manifest && {
              manifestPath: flags.manifest,
              directoryPaths: await getPackageDirs(),
            },
            metadata: flags.metadata && {
              metadataEntries: flags.metadata,
              directoryPaths: await getPackageDirs(),
            },
          }),
          fileResponsesFromDelete: [],
        };
    // stl sets version based on config/files--if the command overrides it, we need to update
    if (isChanges && flags['api-version']) {
      componentSetFromNonDeletes.apiVersion = flags['api-version'];
    }
    this.spinner.status = messages.getMessage('spinner.sending', [
      componentSetFromNonDeletes.sourceApiVersion ?? componentSetFromNonDeletes.apiVersion,
    ]);

    const retrieveOpts: RetrieveSetOptions = {
      usernameOrConnection: flags['target-org'].getUsername(),
      merge: true,
      output: this.project.getDefaultPackage().fullPath,
      packageOptions: flags['package-name'],
      format,
    };

    const zipFileName = flags['zip-file-name'] ?? 'unpackaged.zip';

    if (format === 'metadata') {
      retrieveOpts.singlePackage = flags['single-package'];
      retrieveOpts.unzip = flags.unzip;
      retrieveOpts.zipFileName = zipFileName;
      retrieveOpts.output = flags['target-metadata-dir'];
    }

    const retrieve = await componentSetFromNonDeletes.retrieve(retrieveOpts);

    this.spinner.status = messages.getMessage('spinner.polling');

    retrieve.onUpdate((data) => {
      this.spinner.status = mdTransferMessages.getMessage(data.status);
    });

    // any thing else should stop the progress bar
    retrieve.onFinish((data) => this.spinner.stop(mdTransferMessages.getMessage(data.response.status)));

    retrieve.onCancel((data) => this.spinner.stop(mdTransferMessages.getMessage(data.status)));

    retrieve.onError((error: Error) => {
      this.spinner.stop(error.name);
      throw error;
    });

    await retrieve.start();
    const result = await retrieve.pollStatus(500, flags.wait.seconds);
    this.spinner.stop();

    const formatter =
      format === 'source'
        ? new RetrieveResultFormatter(result, flags['package-name'], fileResponsesFromDelete)
        : new MetadataRetrieveResultFormatter(result, { ...flags, 'zip-file-name': zipFileName });

    if (!this.jsonEnabled()) {
      if (result.response.status === 'Succeeded') {
        await formatter.display();
      } else {
        throw new SfError(
          getString(result.response, 'errorMessage', result.response.status),
          getString(result.response, 'errorStatusCode', 'unknown')
        );
      }
    }

    if (format === 'metadata' && flags.unzip) {
      try {
        await rm(resolve(join(flags['target-metadata-dir'], zipFileName)), { recursive: true });
      } catch (e) {
        // do nothing
      }
    }

    return formatter.getJson();
  }

  protected catch(error: Error | SfError): Promise<SfCommand.Error> {
    if (error instanceof SourceConflictError) {
      if (!this.jsonEnabled()) {
        writeConflictTable(error.data);
        // set the message and add plugin-specific actions
        return super.catch({
          ...error,
          message: messages.getMessage('error.Conflicts'),
          actions: messages.getMessages('error.Conflicts.Actions'),
        });
      }
    }
    return super.catch(error);
  }
}
