/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Interfaces } from '@oclif/core';
import { Lifecycle, Messages, Org, SfError } from '@salesforce/core';
import {
  ComponentSet,
  ComponentSetBuilder,
  ComponentStatus,
  DeployResult,
  DestructiveChangesType,
  FileResponse,
  MetadataComponent,
  RequestStatus,
  SourceComponent,
} from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { ChangeResult, ConflictResponse, SourceTracking } from '@salesforce/source-tracking';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import * as chalk from 'chalk';
import { DeleteSourceJson, TestLevel, isSourceComponent } from '../../../utils/types';
import { getPackageDirs, getSourceApiVersion } from '../../../utils/project';
import { resolveApi } from '../../../utils/deploy';
import { DeployResultFormatter } from '../../../formatters/deployResultFormatter';
import { DeleteResultFormatter } from '../../../formatters/deleteResultFormatter';
import { DeployProgress } from '../../../utils/progressBar';
import { DeployCache } from '../../../utils/deployCache';
import { testLevelFlag } from '../../../utils/flags';
const fsPromises = fs.promises;

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'delete.source');
const xorFlags = ['metadata', 'source-dir'];
export class Source extends SfCommand<DeleteSourceJson> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly aliases = ['force:source:delete'];
  public static readonly deprecateAliases = true;
  public static readonly requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    'check-only': Flags.boolean({
      aliases: ['checkonly'],
      deprecateAliases: true,
      char: 'c',
      description: messages.getMessage('flags.check-only.description'),
      summary: messages.getMessage('flags.check-only.summary'),
    }),
    wait: Flags.duration({
      unit: 'minutes',
      char: 'w',
      default: Duration.minutes(33),
      min: 1,
      description: messages.getMessage('flags.wait.description'),
      summary: messages.getMessage('flags.wait.summary'),
    }),
    'test-level': testLevelFlag({
      aliases: ['testlevel'],
      deprecateAliases: true,
      description: messages.getMessage('flags.test-Level.description'),
      summary: messages.getMessage('flags.test-Level.summary'),
      options: ['NoTestRun', 'RunLocalTests', 'RunAllTestsInOrg'],
      default: TestLevel.NoTestRun,
    }),
    'no-prompt': Flags.boolean({
      char: 'r',
      aliases: ['noprompt'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.no-prompt.summary'),
    }),
    metadata: arrayWithDeprecation({
      char: 'm',
      description: messages.getMessage('flags.metadata.description'),
      summary: messages.getMessage('flags.metadata.summary'),
      exactlyOne: xorFlags,
    }),
    'source-dir': arrayWithDeprecation({
      char: 'p',
      aliases: ['sourcepath'],
      deprecateAliases: true,
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      exactlyOne: xorFlags,
    }),
    'track-source': Flags.boolean({
      char: 't',
      aliases: ['tracksource'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.track-source.summary'),
      exclusive: ['check-only'],
    }),
    'force-overwrite': Flags.boolean({
      char: 'f',
      aliases: ['forceoverwrite'],
      deprecateAliases: true,
      summary: messages.getMessage('flags.force-overwrite.summary'),
      dependsOn: ['track-source'],
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
    }),
  };
  protected fileResponses: FileResponse[] | undefined;
  protected tracking: SourceTracking | undefined;
  // private deleteResultFormatter: DeleteResultFormatter | DeployResultFormatter;
  private aborted = false;
  private components: MetadataComponent[] | undefined;
  // create the delete FileResponse as we're parsing the comp. set to use in the output
  private mixedDeployDelete: { deploy: string[]; delete: FileResponse[] } = { delete: [], deploy: [] };
  // map of component in project, to where it is stashed
  private stashPath = new Map<string, string>();
  private tempDir = path.join(os.tmpdir(), 'source_delete');
  private flags!: Interfaces.InferredFlags<typeof Source.flags>;
  private org!: Org;
  private componentSet!: ComponentSet;
  private isRest!: boolean;
  private deployResult!: DeployResult;
  private deleteResultFormatter!: DeployResultFormatter | DeleteResultFormatter;

  public async run(): Promise<DeleteSourceJson> {
    this.flags = (await this.parse(Source)).flags;
    this.org = this.flags['target-org'];
    await this.preChecks();
    await this.delete();

    await this.resolveSuccess();
    const result = this.formatResult();
    // The DeleteResultFormatter will use SDR and scan the directory, if the files have been deleted, it will throw an error
    // so we'll delete the files locally now
    await this.deleteFilesLocally();
    // makes sure files are deleted before updating tracking files
    await this.maybeUpdateTracking();
    return result;
  }

  protected async preChecks(): Promise<void> {
    if (this.flags['track-source']) {
      this.tracking = await SourceTracking.create({ org: this.org, project: this.project });
    }
  }

  protected async delete(): Promise<void> {
    const sourcepaths = this.flags['source-dir'];

    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.flags['api-version'],
      sourceapiversion: await getSourceApiVersion(),
      sourcepath: sourcepaths,
      metadata: this.flags.metadata
        ? {
            metadataEntries: this.flags.metadata,
            directoryPaths: await getPackageDirs(),
          }
        : undefined,
    });
    if (this.flags['track-source'] && !this.flags['force-overwrite']) {
      await this.filterConflictsByComponentSet();
    }
    this.components = this.componentSet.toArray();

    if (!this.components.length) {
      // if we didn't find any components to delete, let the user know and exit
      this.styledHeader(chalk.blue('Deleted Source'));
      this.log('No results found');
      return;
    }

    // create a new ComponentSet and mark everything for deletion
    const cs = new ComponentSet([]);
    cs.apiVersion =
      this.componentSet.apiVersion ?? this.flags['api-version'] ?? (await this.org.retrieveMaxApiVersion());
    cs.sourceApiVersion =
      this.componentSet.sourceApiVersion ?? this.flags['api-version'] ?? (await getSourceApiVersion());
    this.components.map((component) => {
      if (component instanceof SourceComponent) {
        cs.add(component, DestructiveChangesType.POST);
      } else {
        // a remote-only delete
        cs.add(new SourceComponent({ name: component.fullName, type: component.type }), DestructiveChangesType.POST);
      }
    });
    this.componentSet = cs;

    if (sourcepaths) {
      // determine if user is trying to delete a single file from a bundle, which is actually just an fs delete operation
      // and then a constructive deploy on the "new" bundle
      this.components
        .filter((comp) => comp.type.strategies?.adapter === 'bundle')
        .filter(isSourceComponent)
        .map((bundle: SourceComponent) => {
          sourcepaths.map(async (sourcepath) => {
            // walkContent returns absolute paths while sourcepath will usually be relative
            if (bundle.walkContent().find((content) => content.endsWith(sourcepath))) {
              await this.moveBundleToManifest(bundle, sourcepath);
            }
          });
        });
    }

    this.aborted = !(await this.handlePrompt());
    if (this.aborted) return;

    // fire predeploy event for the delete
    await Lifecycle.getInstance().emit('predeploy', this.components);
    this.isRest = (await resolveApi()) === 'REST';
    this.log(`*** Deleting with ${this.isRest ? 'REST' : 'SOAP'} API ***`);

    const deploy = await this.componentSet.deploy({
      usernameOrConnection: this.org.getUsername() as string,
      apiOptions: {
        rest: this.isRest,
        checkOnly: this.flags['check-only'] ?? false,
        testLevel: this.flags['test-level'],
      },
    });

    new DeployProgress(deploy, this.jsonEnabled()).start();
    this.deployResult = await deploy.pollStatus({ timeout: this.flags.wait });
    if (typeof deploy.id !== 'string') {
      throw new SfError('The deploy id is not a string');
    }
    await DeployCache.update(deploy.id, { status: this.deployResult.response.status });

    await Lifecycle.getInstance().emit('postdeploy', this.deployResult);

    // result.getFileResponses() will crawl the tree, but that would throw after the delete occurs.
    // Extract them here for updateTracking to use later
    this.fileResponses = this.mixedDeployDelete.delete.length
      ? this.mixedDeployDelete.delete
      : this.deployResult.getFileResponses();
  }

  /**
   * Checks the response status to determine whether the delete was successful.
   */
  protected async resolveSuccess(): Promise<void> {
    const status = this.deployResult?.response?.status;
    if (status !== RequestStatus.Succeeded && !this.aborted) {
      process.exitCode = 1;
    }
    // if deploy failed OR the operation was cancelled, restore the stashed files if they exist
    else if (status !== RequestStatus.Succeeded || this.aborted) {
      await Promise.all(
        this.mixedDeployDelete.delete.map(async (file) => {
          await this.restoreFileFromStash(file.filePath as string);
        })
      );
    } else if (this.mixedDeployDelete.delete.length) {
      // successful delete -> delete the stashed file
      await this.deleteStash();
    }
  }

  protected formatResult(): DeleteSourceJson {
    const formatterOptions = {
      verbose: this.flags.verbose ?? false,
    };

    this.deleteResultFormatter = this.mixedDeployDelete.deploy.length
      ? new DeployResultFormatter(this.deployResult, formatterOptions)
      : new DeleteResultFormatter(this.deployResult);

    // Only display results to console when JSON flag is unset.
    if (!this.jsonEnabled()) {
      this.deleteResultFormatter.display();
    }

    if (this.mixedDeployDelete.deploy.length && !this.aborted) {
      // override JSON output when we actually deployed
      const json = this.deleteResultFormatter.getJson() as DeleteSourceJson;
      json.deletedSource = this.mixedDeployDelete.delete; // to match toolbelt json output
      json.outboundFiles = []; // to match toolbelt version
      json.deletes = json.deploys; // to match toolbelt version
      delete json.deploys;
      return json;
    }

    if (this.aborted) {
      return {
        status: 0,
        result: {
          deletedSource: [],
          deletes: [{}],
          outboundFiles: [],
        },
      } as unknown as DeleteSourceJson;
    }

    return this.deleteResultFormatter.getJson() as DeleteSourceJson;
  }

  private async maybeUpdateTracking(): Promise<void> {
    if (this.flags['track-source'] ?? false) {
      // might not exist if we exited from the operation early
      if (!this.deployResult) {
        return;
      }
      this.spinner.start('Updating source tracking');

      const successes = (this.fileResponses ?? this.deployResult.getFileResponses()).filter(
        (fileResponse) => fileResponse.state !== ComponentStatus.Failed
      );
      if (!successes.length) {
        this.spinner.stop();
        return;
      }

      await Promise.all([
        this.tracking?.updateLocalTracking({
          files: successes
            .filter((fileResponse) => fileResponse.state !== ComponentStatus.Deleted)
            .map((fileResponse) => fileResponse.filePath) as string[],
          deletedFiles: successes
            .filter((fileResponse) => fileResponse.state === ComponentStatus.Deleted)
            .map((fileResponse) => fileResponse.filePath) as string[],
        }),
        this.tracking?.updateRemoteTracking(
          successes.map(({ state, fullName, type, filePath }) => ({ state, fullName, type, filePath }))
        ),
      ]);

      this.spinner.stop();
    }
  }

  private async deleteFilesLocally(): Promise<void> {
    if (!this.flags['check-only'] && this.deployResult?.response?.status === RequestStatus.Succeeded) {
      const promises: Array<Promise<void>> = [];
      this.components?.filter(isSourceComponent).map((component: SourceComponent) => {
        // mixed delete/deploy operations have already been deleted and stashed
        if (!this.mixedDeployDelete.delete.length) {
          if (component.content) {
            const stats = fs.statSync(component.content);
            if (stats.isDirectory()) {
              promises.push(fsPromises.rm(component.content, { recursive: true }));
            } else {
              promises.push(fsPromises.unlink(component.content));
            }
          }
          if (component.xml) {
            promises.push(fsPromises.unlink(component.xml));
          }
        }
      });
      await Promise.all(promises);
    }
  }

  private async moveFileToStash(file: string): Promise<void> {
    await fsPromises.mkdir(path.dirname(this.stashPath.get(file) as string), { recursive: true });
    await fsPromises.copyFile(file, this.stashPath.get(file) as string);
    await fsPromises.unlink(file);
  }

  private async restoreFileFromStash(file: string): Promise<void> {
    await fsPromises.rename(this.stashPath.get(file) as string, file);
  }

  private async deleteStash(): Promise<void> {
    await fsPromises.rm(this.tempDir, { recursive: true, force: true });
  }

  private async moveBundleToManifest(bundle: SourceComponent, sourcepath: string): Promise<void> {
    // if one of the passed in sourcepaths is to a bundle component
    const fileName = path.basename(sourcepath);
    if (!bundle.name) {
      throw new SfError(`Unable to find bundle name for ${sourcepath}`);
    }
    const fullName = path.join(bundle.name, fileName);
    this.mixedDeployDelete.delete.push({
      state: ComponentStatus.Deleted,
      fullName,
      type: bundle.type.name,
      filePath: sourcepath,
    });
    // stash the file in case we need to restore it due to failed deploy/aborted command
    this.stashPath.set(sourcepath, path.join(this.tempDir, fullName));
    await this.moveFileToStash(sourcepath);

    // re-walk the directory to avoid picking up the deleted file
    this.mixedDeployDelete.deploy.push(...bundle.walkContent());

    // now remove the bundle from destructive changes and add to manifest
    // set the bundle as NOT marked for delete
    this.componentSet.destructiveChangesPost.delete(`${bundle.type.id}#${bundle.fullName}`);
    bundle.setMarkedForDelete(false);
    this.componentSet.add(bundle);
  }

  private async handlePrompt(): Promise<boolean> {
    if (!this.flags['no-prompt']) {
      const remote: string[] = [];
      let local: string[] = [];
      const message: string[] = [];

      this.components?.flatMap((component) => {
        if (component instanceof SourceComponent) {
          local.push(component.xml as string, ...component.walkContent());
        } else {
          // remote only metadata
          remote.push(`${component.type.name}:${component.fullName}`);
        }
      });

      if (this.mixedDeployDelete.delete.length) {
        local = this.mixedDeployDelete.delete.map((fr) => fr.fullName);
      }

      if (this.mixedDeployDelete.deploy.length) {
        message.push(messages.getMessage('deployPrompt', [[...new Set(this.mixedDeployDelete.deploy)].join('\n')]));
      }

      if (remote.length) {
        message.push(messages.getMessage('remotePrompt', [[...new Set(remote)].join('\n')]));
      }

      if (local.length) {
        if (message.length) {
          // add a whitespace between remote and local
          message.push('\n');
        }
        message.push('\n', messages.getMessage('localPrompt', [[...new Set(local)].join('\n')]));
      }

      message.push(
        this.flags['check-only'] ?? false
          ? messages.getMessage('areYouSureCheckOnly')
          : messages.getMessage('areYouSure')
      );
      return this.confirm(message.join('\n'));
    }
    return true;
  }

  /**
   * Check if any conflicts exist in a specific component set.
   * If conflicts exist, this will output the table and throw
   */
  private filterConflictsByComponentSet = async (): Promise<ChangeResult[]> => {
    const filteredConflicts =
      (await this.tracking?.getConflicts())?.filter((cr) =>
        this.componentSet.has({ fullName: cr.name as string, type: cr.type as string })
      ) ?? [];
    this.processConflicts(filteredConflicts, messages.getMessage('conflictMsg'));
    return filteredConflicts;
  };

  /**
   * Write a table (if not json) and throw an error that includes a custom message and the conflict data
   *
   * @param conflicts
   * @param message
   */
  private processConflicts = (conflicts: ChangeResult[], message: string): void => {
    if (conflicts.length === 0) {
      return;
    }

    this.table(conflicts, {
      state: { header: 'STATE' },
      fullName: { header: 'FULL NAME' },
      type: { header: 'TYPE' },
      filePath: { header: 'FILE PATH' },
    });

    // map do dedupe by name-type-filename
    const conflictMap = new Map<string, ConflictResponse>();
    conflicts.forEach((c) => {
      c.filenames?.forEach((f) => {
        conflictMap.set(`${c.name}#${c.type}#${f}`, {
          state: 'Conflict',
          fullName: c.name as string,
          type: c.type as string,
          filePath: path.resolve(f),
        });
      });
    });
    const reformattedConflicts = Array.from(conflictMap.values());

    const err = new SfError(message, 'sourceConflictDetected');
    err.setData(reformattedConflicts);
    throw err;
  };
}
