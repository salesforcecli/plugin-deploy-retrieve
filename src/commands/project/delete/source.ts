/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { Interfaces } from '@oclif/core';
import { Lifecycle, Messages, Org, SfError } from '@salesforce/core';
import {
  ComponentSet,
  ComponentSetBuilder,
  ComponentStatus,
  DeployResult,
  DestructiveChangesType,
  FileResponse,
  FileResponseSuccess,
  MetadataComponent,
  RequestStatus,
  SourceComponent,
} from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { ChangeResult, ConflictResponse, deleteCustomLabels, SourceTracking } from '@salesforce/source-tracking';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import { DeployStages } from '../../../utils/deployStages.js';
import { writeConflictTable } from '../../../utils/conflicts.js';
import { isNonDecomposedCustomLabel, isNonDecomposedCustomLabelsOrCustomLabel } from '../../../utils/metadataTypes.js';
import { getFileResponseSuccessProps, tableHeader } from '../../../utils/output.js';
import { API, DeleteSourceJson, isFileResponseDeleted, isSdrSuccess, isSourceComponent } from '../../../utils/types.js';
import { getPackageDirs, getSourceApiVersion } from '../../../utils/project.js';
import { resolveApi, validateTests } from '../../../utils/deploy.js';
import { DeployResultFormatter } from '../../../formatters/deployResultFormatter.js';
import { DeleteResultFormatter } from '../../../formatters/deleteResultFormatter.js';
import { DeployCache } from '../../../utils/deployCache.js';
import { testLevelFlag, testsFlag } from '../../../utils/flags.js';
const testFlags = 'Test';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'delete.source');
const xorFlags = ['metadata', 'source-dir'];

type MixedDeployDelete = { deploy: string[]; delete: FileResponseSuccess[] };
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
    tests: testsFlag({
      helpGroup: testFlags,
      char: undefined,
    }),
    'test-level': testLevelFlag({
      aliases: ['testlevel'],
      deprecateAliases: true,
      helpGroup: testFlags,
      description: messages.getMessage('flags.test-Level.description'),
      summary: messages.getMessage('flags.test-Level.summary'),
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
  private components: MetadataComponent[] | undefined;
  // create the delete FileResponse as we're parsing the comp. set to use in the output
  private mixedDeployDelete: MixedDeployDelete = { delete: [], deploy: [] };
  // map of component in project, to where it is stashed
  private stashPath = new Map<string, string>();
  private flags!: Interfaces.InferredFlags<typeof Source.flags>;
  private org!: Org;
  private componentSet!: ComponentSet;
  private deployResult!: DeployResult;

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
      this.tracking = await SourceTracking.create({ org: this.org, project: this.project! });
    }

    if (!validateTests(this.flags['test-level'], this.flags.tests)) {
      throw messages.createError('error.NoTestsSpecified');
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
      projectDir: this.project?.getPath(),
    });
    if (this.flags['track-source'] && !this.flags['force-overwrite']) {
      await this.filterConflictsByComponentSet();
    }
    this.components = this.componentSet.toArray();

    if (!this.components.length) {
      // if we didn't find any components to delete, let the user know and exit
      this.styledHeader(tableHeader('Deleted Source'));
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
      await Promise.all([
        // determine if user is trying to delete a single file from a bundle, which is actually just an fs delete operation
        // and then a constructive deploy on the "new" bundle
        ...this.components
          .filter((comp) => comp.type.strategies?.adapter === 'bundle')
          .filter(isSourceComponent)
          .flatMap((bundle) =>
            sourcepaths
              .filter(someContentsEndWithPath(bundle))
              .map((sourcepath) =>
                this.moveToManifest(bundle, sourcepath, path.join(bundle.name, path.basename(sourcepath)))
              )
          ),
        // same for decomposed components with non-addressable children (ex: decomposedPermissionSet.  Deleting a file means "redploy without that")
        ...this.components
          .filter(allChildrenAreNotAddressable)
          .filter(isSourceComponent)
          .flatMap((decomposed) =>
            sourcepaths
              .filter(someContentsEndWithPath(decomposed))
              .map((sourcepath) => this.moveToManifest(decomposed, sourcepath, decomposed.fullName))
          ),
      ]);
    }

    if (!(await this.handlePrompt())) {
      await Promise.all(
        this.mixedDeployDelete.delete.map(async (file) => {
          await restoreFileFromStash(this.stashPath, file.filePath);
        })
      );
      throw messages.createError('prompt.delete.cancel');
    }

    // fire predeploy event for the delete
    await Lifecycle.getInstance().emit('predeploy', this.components);

    const stages = new DeployStages({
      title: 'Deleting Metadata',
      jsonEnabled: this.jsonEnabled(),
    });

    const isRest = (await resolveApi()) === API['REST'];
    stages.update({ message: `Deleting with ${isRest ? 'REST' : 'SOAP'} API` });

    const deploy = await this.componentSet.deploy({
      usernameOrConnection: this.org.getUsername() as string,
      apiOptions: {
        rest: isRest,
        checkOnly: this.flags['check-only'] ?? false,
        ...(this.flags.tests ? { runTests: this.flags.tests } : {}),
        ...(this.flags['test-level'] ? { testLevel: this.flags['test-level'] } : {}),
      },
    });

    stages.start({ deploy, username: this.org.getUsername() });
    this.deployResult = await deploy.pollStatus({ timeout: this.flags.wait });
    if (!deploy.id) {
      stages.error();
      throw new SfError('The deploy id is not available.');
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
    // if deploy failed restore the stashed files if they exist
    if (this.deployResult?.response?.status !== RequestStatus.Succeeded) {
      process.exitCode = 1;
      await Promise.all(
        this.mixedDeployDelete.delete.map(async (file) => {
          await restoreFileFromStash(this.stashPath, file.filePath);
        })
      );
    } else if (this.mixedDeployDelete.delete.length) {
      // successful delete -> delete the stashed file
      return deleteStash();
    }
  }

  protected async formatResult(): Promise<DeleteSourceJson> {
    const formatterOptions = {
      verbose: this.flags.verbose ?? false,
      testLevel: this.flags['test-level'],
    };

    const deleteResultFormatter = this.mixedDeployDelete.deploy.length
      ? new DeployResultFormatter(this.deployResult, formatterOptions, this.mixedDeployDelete.delete)
      : new DeleteResultFormatter(this.deployResult, formatterOptions);

    // Only display results to console when JSON flag is unset.
    if (!this.jsonEnabled()) {
      deleteResultFormatter.display();
    }

    if (this.mixedDeployDelete.deploy.length) {
      // override JSON output when we actually deployed
      const json = (await deleteResultFormatter.getJson()) as DeleteSourceJson;
      json.deletedSource = this.mixedDeployDelete.delete; // to match toolbelt json output
      json.outboundFiles = []; // to match toolbelt version
      json.deletes = json.deploys; // to match toolbelt version
      delete json.deploys;
      return json;
    }

    return (await deleteResultFormatter.getJson()) as DeleteSourceJson;
  }

  private async maybeUpdateTracking(): Promise<void> {
    if (this.flags['track-source'] ?? false) {
      // might not exist if we exited from the operation early
      if (!this.deployResult) {
        return;
      }
      this.spinner.start('Updating source tracking');

      const successes = (this.fileResponses ?? this.deployResult.getFileResponses()).filter(isSdrSuccess);
      if (!successes.length) {
        this.spinner.stop();
        return;
      }

      await Promise.all([
        this.tracking?.updateLocalTracking({
          files: successes
            .filter((fileResponse) => fileResponse.state !== ComponentStatus.Deleted)
            .map((fileResponse) => fileResponse.filePath),
          deletedFiles: successes.filter(isFileResponseDeleted).map((fileResponse) => fileResponse.filePath),
        }),
        this.tracking?.updateRemoteTracking(successes.map(getFileResponseSuccessProps)),
      ]);

      this.spinner.stop();
    }
  }

  private async deleteFilesLocally(): Promise<void> {
    if (!this.flags['check-only'] && this.deployResult?.response?.status === RequestStatus.Succeeded) {
      const customLabels = this.componentSet.getSourceComponents().toArray().filter(isNonDecomposedCustomLabel);
      const promisesFromLabels = customLabels[0]?.xml ? [deleteCustomLabels(customLabels[0].xml, customLabels)] : [];
      // mixed delete/deploy operations have already been deleted and stashed
      const otherPromises = !this.mixedDeployDelete.delete.length
        ? (this.components ?? [])
            .filter(isSourceComponent)
            .flatMap((component: SourceComponent) => [
              ...(component.content ? [fs.promises.rm(component.content, { recursive: true, force: true })] : []),
              ...(component.xml && !isNonDecomposedCustomLabel(component) ? [fs.promises.rm(component.xml)] : []),
            ])
        : [];

      await Promise.all([...promisesFromLabels, ...otherPromises]);
    }
  }

  private async moveToManifest(cmp: SourceComponent, sourcepath: string, fullName: string): Promise<void> {
    this.mixedDeployDelete.delete.push({
      state: ComponentStatus.Deleted,
      fullName,
      type: cmp.type.name,
      filePath: sourcepath,
    });

    // stash the file in case we need to restore it due to failed deploy/aborted command
    this.stashPath.set(sourcepath, path.join(os.tmpdir(), 'source_delete', fullName));
    await moveFileToStash(this.stashPath, sourcepath);
    // re-walk the directory to avoid picking up the deleted file
    this.mixedDeployDelete.deploy.push(...cmp.walkContent());

    // now from destructive changes and add to manifest
    // set NOT marked for delete
    this.componentSet.destructiveChangesPost.delete(`${cmp.type.id}#${cmp.fullName}`);
    cmp.setMarkedForDelete(false);
    this.componentSet.add(cmp);
  }

  private async handlePrompt(): Promise<boolean> {
    if (!this.flags['no-prompt']) {
      const remote = (this.components ?? [])
        .filter((comp) => !(comp instanceof SourceComponent))
        .map((comp) => `${comp.type.name}:${comp.fullName}`);

      const local = (this.components ?? [])
        .filter(isSourceComponent)
        .filter(sourceComponentIsNotInMixedDeployDelete(this.mixedDeployDelete))
        .flatMap((c) =>
          // for custom labels, print each custom label to be deleted, not the whole file
          isNonDecomposedCustomLabelsOrCustomLabel(c) ? [`${c.type.name}:${c.fullName}`] : [c.xml, ...c.walkContent()]
        )
        .concat(this.mixedDeployDelete.delete.map((fr) => `${fr.fullName} (${fr.filePath})`));

      const message: string[] = [
        ...(this.mixedDeployDelete.deploy.length
          ? [messages.getMessage('deployPrompt', [[...new Set(this.mixedDeployDelete.deploy)].join('\n')])]
          : []),

        ...(remote.length ? [messages.getMessage('remotePrompt', [[...new Set(remote)].join('\n')])] : []),

        // add a whitespace between remote and local
        ...(local.length && (this.mixedDeployDelete.deploy.length || remote.length) ? ['\n'] : []),
        ...(local.length ? [messages.getMessage('localPrompt', [[...new Set(local)].join('\n')])] : []),

        this.flags['check-only'] ?? false
          ? messages.getMessage('areYouSureCheckOnly')
          : messages.getMessage('areYouSure'),
      ];

      return this.confirm({ message: message.join('\n') });
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
    processConflicts(filteredConflicts, messages.getMessage('conflictMsg'));
    return filteredConflicts;
  };
}

const moveFileToStash = async (stashPath: Map<string, string>, file: string): Promise<void> => {
  await fs.promises.mkdir(path.dirname(stashPath.get(file) as string), { recursive: true });
  await fs.promises.copyFile(file, stashPath.get(file) as string);
  await fs.promises.unlink(file);
};

const restoreFileFromStash = async (stashPath: Map<string, string>, file: string): Promise<void> =>
  fs.promises.rename(stashPath.get(file) as string, file);

const deleteStash = async (): Promise<void> =>
  fs.promises.rm(path.join(os.tmpdir(), 'source_delete'), { recursive: true, force: true });

const someContentsEndWithPath =
  (cmp: SourceComponent) =>
  (sourcePath: string): boolean =>
    // walkContent returns absolute paths while sourcepath will usually be relative
    cmp.walkContent().some((content) => content.endsWith(sourcePath));

const allChildrenAreNotAddressable = (comp: MetadataComponent): boolean => {
  const types = Object.values(comp.type.children?.types ?? {});
  return types.length > 0 && types.every((child) => child.isAddressable === false);
};

const sourceComponentIsNotInMixedDeployDelete =
  (mixedDeployDelete: MixedDeployDelete) =>
  (c: SourceComponent): boolean =>
    !mixedDeployDelete.delete.some((d) => d.fullName === c.fullName && d.type === c.type.name);

/**
 * Write a table (if not json) and throw an error that includes a custom message and the conflict data
 *
 * @param conflicts
 * @param message
 */
const processConflicts = (conflicts: ChangeResult[], message: string): void => {
  if (conflicts.length === 0) return;

  const reformattedConflicts = Array.from(
    // map do dedupe by name-type-filename
    new Map(
      conflicts.flatMap(changeResultToConflictResponses).map((c) => [`${c.fullName}#${c.type}#${c.filePath}`, c])
    ).values()
  );

  writeConflictTable(reformattedConflicts);

  const err = new SfError(message, 'sourceConflictDetected');
  err.setData(reformattedConflicts);
  throw err;
};

/** each ChangeResult can have multiple filenames, each of which becomes a ConflictResponse */
const changeResultToConflictResponses = (cr: ChangeResult): ConflictResponse[] =>
  (cr.filenames ?? []).map((f) => ({
    state: 'Conflict',
    fullName: cr.name ?? '<Name is missing>',
    type: cr.type ?? '<Type is missing>',
    filePath: path.resolve(f),
  }));
