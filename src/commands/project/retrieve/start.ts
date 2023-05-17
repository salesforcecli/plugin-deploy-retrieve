/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { rm } from 'fs/promises';
import { join, resolve } from 'path';

import { EnvironmentVariable, Messages, OrgConfigProperties, SfError, SfProject } from '@salesforce/core';
import {
  RetrieveResult,
  ComponentSetBuilder,
  RetrieveSetOptions,
  ComponentSet,
  FileResponse,
} from '@salesforce/source-deploy-retrieve';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { getString } from '@salesforce/ts-types';
import { SourceTracking, SourceConflictError } from '@salesforce/source-tracking';
import { Duration } from '@salesforce/kit';
import { Interfaces } from '@oclif/core';

import { DEFAULT_ZIP_FILE_NAME, ensuredDirFlag, zipFileFlag } from '../../../utils/flags';
import { RetrieveResultFormatter } from '../../../formatters/retrieveResultFormatter';
import { MetadataRetrieveResultFormatter } from '../../../formatters/metadataRetrieveResultFormatter';
import { getPackageDirs } from '../../../utils/project';
import { RetrieveResultJson } from '../../../utils/types';
import { writeConflictTable } from '../../../utils/conflicts';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'retrieve.metadata');
const mdTransferMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'metadata.transfer');

type Format = 'source' | 'metadata';
export default class RetrieveMetadata extends SfCommand<RetrieveResultJson> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly aliases = ['retrieve:metadata'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
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
      required: true,
    }),
    wait: Flags.duration({
      char: 'w',
      defaultValue: 33,
      default: Duration.minutes(33),
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
    const format: Format = flags['target-metadata-dir'] ? 'metadata' : 'source';

    this.spinner.start(messages.getMessage('spinner.start'));

    const { componentSetFromNonDeletes, fileResponsesFromDelete = [] } = await buildRetrieveAndDeleteTargets(
      flags,
      format
    );
    const retrieveOpts = await buildRetrieveOptions(flags, format);

    this.spinner.status = messages.getMessage('spinner.sending', [
      componentSetFromNonDeletes.sourceApiVersion ?? componentSetFromNonDeletes.apiVersion,
    ]);

    const retrieve = await componentSetFromNonDeletes.retrieve(retrieveOpts);

    this.spinner.status = messages.getMessage('spinner.polling');

    retrieve.onUpdate((data) => {
      this.spinner.status = mdTransferMessages.getMessage(data.status);
    });
    // any thing else should stop the progress bar
    retrieve.onFinish((data) => this.spinner.stop(mdTransferMessages.getMessage(data.response.status)));
    retrieve.onCancel((data) => this.spinner.stop(mdTransferMessages.getMessage(data?.status ?? 'Canceled')));
    retrieve.onError((error: Error) => {
      this.spinner.stop(error.name);
      throw error;
    });

    await retrieve.start();
    const result = await retrieve.pollStatus(500, flags.wait.seconds);
    this.spinner.stop();

    // reference the flag instead of `format` so we get correct type
    const formatter = flags['target-metadata-dir']
      ? new MetadataRetrieveResultFormatter(result, {
          'target-metadata-dir': flags['target-metadata-dir'],
          'zip-file-name': flags['zip-file-name'] ?? DEFAULT_ZIP_FILE_NAME,
          unzip: flags.unzip,
        })
      : new RetrieveResultFormatter(result, flags['package-name'], fileResponsesFromDelete);
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
        await rm(resolve(join(flags['target-metadata-dir'] ?? '', flags['zip-file-name'] ?? DEFAULT_ZIP_FILE_NAME)), {
          recursive: true,
        });
      } catch (e) {
        // do nothing
      }
    }

    return formatter.getJson();
  }

  protected catch(error: Error | SfError): Promise<SfCommand.Error> {
    if (!this.jsonEnabled() && error instanceof SourceConflictError) {
      writeConflictTable(error.data);
      // set the message and add plugin-specific actions
      return super.catch({
        ...error,
        message: messages.getMessage('error.Conflicts'),
        actions: messages.getMessages('error.Conflicts.Actions', [this.config.bin]),
      });
    }

    return super.catch(error);
  }
}

type RetrieveAndDeleteTargets = {
  /** componentSet that can be used to retrieve known changes */
  componentSetFromNonDeletes: ComponentSet;
  /** optional Array of artificially constructed FileResponses from the deletion of local files */
  fileResponsesFromDelete?: FileResponse[];
};

const buildRetrieveAndDeleteTargets = async (
  flags: Interfaces.InferredFlags<typeof RetrieveMetadata.flags>,
  format: Format
): Promise<RetrieveAndDeleteTargets> => {
  const isChanges = !flags['source-dir'] && !flags['manifest'] && !flags['metadata'] && !flags['target-metadata-dir'];

  if (isChanges) {
    const stl = await SourceTracking.create({
      org: flags['target-org'],
      project: await SfProject.resolve(),
      subscribeSDREvents: true,
      ignoreConflicts: format === 'metadata' || flags['ignore-conflicts'],
    });
    const result = await stl.maybeApplyRemoteDeletesToLocal(true);
    // STL returns a componentSet that gets these from the project/config.
    // if the command has a flag, we'll override
    if (flags['api-version']) {
      result.componentSetFromNonDeletes.apiVersion = flags['api-version'];
    }
    return result;
  } else {
    return {
      componentSetFromNonDeletes: await ComponentSetBuilder.build({
        apiversion: flags['api-version'],
        sourcepath: flags['source-dir'],
        packagenames: flags['package-name'],
        ...(flags.manifest
          ? {
              manifest: {
                manifestPath: flags.manifest,
                // if mdapi format, there might not be a project
                directoryPaths: format === 'metadata' ? [] : await getPackageDirs(),
              },
            }
          : {}),
        ...(flags.metadata
          ? {
              metadata: {
                metadataEntries: flags.metadata,
                // if mdapi format, there might not be a project
                directoryPaths: format === 'metadata' ? [] : await getPackageDirs(),
              },
            }
          : {}),
      }),
    };
  }
};

/**
 *
 *
 * @param flags
 * @param project
 * @param format 'metadata' or 'source'
 * @returns RetrieveSetOptions (an object that can be passed as the options for a ComponentSet retrieve)
 */
const buildRetrieveOptions = async (
  flags: Interfaces.InferredFlags<typeof RetrieveMetadata.flags>,
  format: Format
): Promise<RetrieveSetOptions> => ({
  usernameOrConnection: flags['target-org'].getUsername() ?? flags['target-org'].getConnection(flags['api-version']),
  merge: true,
  packageOptions: flags['package-name'],
  format,
  ...(format === 'metadata'
    ? {
        singlePackage: flags['single-package'],
        unzip: flags.unzip,
        zipFileName: flags['zip-file-name'] ?? DEFAULT_ZIP_FILE_NAME,
        // known to exist because that's how `format` becomes 'metadata'
        output: flags['target-metadata-dir'] as string,
      }
    : {
        output: (await SfProject.resolve()).getDefaultPackage().fullPath,
      }),
});
