/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConfigAggregator, Messages, Org, SfError, SfProject } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { Nullable } from '@salesforce/ts-types';
import {
  ComponentSet,
  ComponentSetBuilder,
  DeployResult,
  MetadataApiDeploy,
  MetadataApiDeployOptions,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';
import { SourceTracking } from '@salesforce/source-tracking';
import ConfigMeta, { ConfigVars } from '../configMeta.js';
import { getPackageDirs, getSourceApiVersion } from './project.js';
import { API, PathInfo, TestLevel } from './types.js';
import { DEPLOY_STATUS_CODES } from './errorCodes.js';
import { DeployCache } from './deployCache.js';
import { writeManifest } from './manifestCache.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
export const cacheMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'cache');

const deployMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');

export type DeployOptions = {
  api: API;
  'target-org': string;
  'test-level': TestLevel;
  async?: boolean;
  'api-version'?: string;
  'dry-run'?: boolean;
  'ignore-conflicts'?: boolean;
  'ignore-errors'?: boolean;
  'ignore-warnings'?: boolean;
  manifest?: string;
  metadata?: string[];
  'metadata-dir'?: PathInfo;
  'source-dir'?: string[];
  tests?: string[];
  wait?: Duration;
  verbose?: boolean;
  concise?: boolean;
  'single-package'?: boolean;
  status?: RequestStatus;

  'pre-destructive-changes'?: string;
  'post-destructive-changes'?: string;

  'purge-on-delete'?: boolean;
};

/** Manifest is expected.  You cannot pass metadata and source-dir array--use those to get a manifest */
export type CachedOptions = Omit<DeployOptions, 'wait' | 'metadata' | 'source-dir'> & {
  wait: number;
  /** whether the user passed in anything for metadata-dir (could be a folder, could be a zip) */
  isMdapi: boolean;
} & Partial<Pick<DeployOptions, 'manifest'>>;

export function validateTests(testLevel: TestLevel | undefined, tests: Nullable<string[]>): boolean {
  return !(testLevel === TestLevel.RunSpecifiedTests && (tests ?? []).length === 0);
}

export async function resolveApi(existingConfigAggregator?: ConfigAggregator): Promise<API> {
  const agg = existingConfigAggregator ?? (await ConfigAggregator.create({ customConfigMeta: ConfigMeta }));
  const restDeployConfig = agg.getInfo(ConfigVars.ORG_METADATA_REST_DEPLOY)?.value;
  return restDeployConfig === 'true' ? API.REST : API.SOAP;
}

export async function buildComponentSet(opts: Partial<DeployOptions>, stl?: SourceTracking): Promise<ComponentSet> {
  // if you specify nothing, you'll get the changes, like sfdx push, as long as there's an stl
  if (!opts['source-dir'] && !opts.manifest && !opts.metadata && stl) {
    /** localChangesAsComponentSet returned an array to support multiple sequential deploys.
     * `sf` chooses not to support this so we force one ComponentSet
     */
    const cs = (await stl.localChangesAsComponentSet(false))[0] ?? new ComponentSet(undefined, stl.registry);
    // stl produces a cs with api version already set.  command might have specified a version.
    if (opts['api-version']) {
      cs.apiVersion = opts['api-version'];
      cs.sourceApiVersion = opts['api-version'];
    }
    return cs;
  }

  return ComponentSetBuilder.build({
    apiversion: opts['api-version'],
    sourceapiversion: await getSourceApiVersion(),
    sourcepath: opts['source-dir'],
    ...(opts.manifest
      ? {
          manifest: {
            manifestPath: opts.manifest,
            directoryPaths: await getPackageDirs(),
            destructiveChangesPre: opts['pre-destructive-changes'],
            destructiveChangesPost: opts['post-destructive-changes'],
          },
        }
      : {}),
    ...(opts.metadata ? { metadata: { metadataEntries: opts.metadata, directoryPaths: await getPackageDirs() } } : {}),
    projectDir: stl?.projectPath,
  });
}

export async function executeDeploy(
  opts: Partial<DeployOptions>,
  bin?: string,
  project?: SfProject,
  id?: string,
  throwOnEmpty?: true
): Promise<{ deploy: MetadataApiDeploy; componentSet?: ComponentSet }>;
export async function executeDeploy(
  opts: Partial<DeployOptions>,
  bin = 'sf',
  project?: SfProject,
  id?: string,
  throwOnEmpty = false
): Promise<{ deploy?: MetadataApiDeploy; componentSet?: ComponentSet }> {
  const apiOptions = buildApiOptions(opts);

  let deploy: MetadataApiDeploy | undefined;
  let componentSet: ComponentSet | undefined;

  const org = await Org.create({ aliasOrUsername: opts['target-org'] });
  // for mdapi deploys, use the passed in api-version.
  const usernameOrConnection = org.getConnection(opts['metadata-dir'] ? opts['api-version'] : undefined);

  if (opts['metadata-dir']) {
    if (id) {
      deploy = new MetadataApiDeploy({ id, usernameOrConnection });
    } else {
      const key = opts['metadata-dir'].type === 'directory' ? 'mdapiPath' : 'zipPath';
      deploy = new MetadataApiDeploy({
        [key]: opts['metadata-dir'].path,
        usernameOrConnection,
        apiOptions: { ...apiOptions, singlePackage: opts['single-package'] ?? false },
      });
      await deploy.start();
    }
  } else {
    // mdapi format deploys don't require a project, but at this point we need one
    project ??= await SfProject.resolve();
    // instantiate source tracking
    // stl will decide, based on the org's properties, what needs to be done
    const stl = await SourceTracking.create({
      org,
      project,
      subscribeSDREvents: true,
      ignoreConflicts: opts['ignore-conflicts'],
    });
    componentSet = await buildComponentSet(opts, stl);
    if (componentSet.size === 0) {
      if (opts['source-dir'] ?? opts.manifest ?? opts.metadata ?? throwOnEmpty) {
        // the user specified something to deploy, but there isn't anything
        throw new SfError(
          deployMessages.getMessage('error.nothingToDeploy'),
          'NothingToDeploy',
          deployMessages.getMessages('error.nothingToDeploy.Actions', [bin])
        );
      } else {
        // this is a push-like "deploy changes" but there aren't any.
        // users unanimously think this should not be an error https://github.com/forcedotcom/cli/discussions/2065
        return {};
      }
    }
    deploy = id
      ? new MetadataApiDeploy({ id, usernameOrConnection, components: componentSet })
      : await componentSet.deploy({
          usernameOrConnection,
          apiOptions,
        });
  }

  if (!deploy.id) {
    throw new SfError('The deploy id is not available.');
  }

  // does not apply to mdapi deploys
  const manifestPath = componentSet ? await writeManifest(deploy.id, componentSet) : undefined;
  await DeployCache.set(deploy.id, { ...opts, manifest: manifestPath });

  return { deploy, componentSet };
}

export async function cancelDeploy(opts: Partial<DeployOptions>, id: string): Promise<DeployResult> {
  const org = await Org.create({ aliasOrUsername: opts['target-org'] });
  const usernameOrConnection = org.getUsername() ?? org.getConnection();

  const deploy = new MetadataApiDeploy({ usernameOrConnection, id });
  if (!deploy.id) {
    throw new SfError('The deploy id is not available.');
  }
  await DeployCache.set(deploy.id, { ...opts });

  await deploy.cancel();
  return deploy.pollStatus({
    frequency: Duration.milliseconds(500),
    timeout: opts.wait ?? Duration.minutes(33),
  });
}

export async function cancelDeployAsync(opts: Partial<DeployOptions>, id: string): Promise<{ id: string }> {
  const org = await Org.create({ aliasOrUsername: opts['target-org'] });
  const usernameOrConnection = org.getUsername() ?? org.getConnection();
  const deploy = new MetadataApiDeploy({ usernameOrConnection, id });
  await deploy.cancel();
  if (!deploy.id) {
    throw new SfError('The deploy id is not available.');
  }
  return { id: deploy.id };
}

export function determineExitCode(result: DeployResult, async = false): number {
  if (async) {
    return result.response.status === RequestStatus.Succeeded ? 0 : 1;
  }

  return DEPLOY_STATUS_CODES.get(result.response.status) ?? 1;
}

export const isNotResumable = (status?: RequestStatus): boolean =>
  status !== undefined &&
  [RequestStatus.Succeeded, RequestStatus.Failed, RequestStatus.SucceededPartial, RequestStatus.Canceled].includes(
    status
  );

/** apply some defaults to the DeployOptions object  */
const buildApiOptions = (opts: Partial<DeployOptions>): MetadataApiDeployOptions['apiOptions'] => ({
  checkOnly: opts['dry-run'] ?? false,
  ignoreWarnings: opts['ignore-warnings'] ?? false,
  rest: opts.api === API['REST'],
  rollbackOnError: !opts['ignore-errors'] || false,
  ...(opts.tests ? { runTests: opts.tests } : {}),
  ...(opts['test-level'] ? { testLevel: opts['test-level'] } : {}),
  purgeOnDelete: opts['purge-on-delete'] ?? false,
});
