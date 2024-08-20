/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org, SfProject } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { ComponentSet, DeployResult, MetadataApiDeploy, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployStages } from '../../../utils/deployStages.js';
import { buildComponentSet } from '../../../utils/deploy.js';
import { DeployCache } from '../../../utils/deployCache.js';
import { DeployReportResultFormatter } from '../../../formatters/deployReportResultFormatter.js';
import { API, DeployResultJson } from '../../../utils/types.js';
import { coverageFormattersFlag } from '../../../utils/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata.report');
const deployMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');
const testFlags = 'Test';

export default class DeployMetadataReport extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly aliases = ['deploy:metadata:report'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'target-org': Flags.optionalOrg(),
    'job-id': Flags.salesforceId({
      char: 'i',
      startsWith: '0Af',
      length: 'both',
      description: messages.getMessage('flags.job-id.description'),
      summary: messages.getMessage('flags.job-id.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
    'use-most-recent': Flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.use-most-recent.description'),
      summary: messages.getMessage('flags.use-most-recent.summary'),
      exactlyOne: ['use-most-recent', 'job-id'],
    }),
    'coverage-formatters': coverageFormattersFlag({ helpGroup: testFlags }),
    junit: Flags.boolean({
      summary: messages.getMessage('flags.junit.summary'),
      helpGroup: testFlags,
    }),
    'results-dir': Flags.directory({
      relationships: [{ type: 'some', flags: ['coverage-formatters', 'junit'] }],
      summary: messages.getMessage('flags.results-dir.summary'),
      helpGroup: testFlags,
    }),
    // we want to allow undefined for a simple check deploy status
    // eslint-disable-next-line sf-plugin/flag-min-max-default
    wait: Flags.duration({
      char: 'w',
      summary: deployMessages.getMessage('flags.wait.summary'),
      description: deployMessages.getMessage('flags.wait.description'),
      unit: 'minutes',
      helpValue: '<minutes>',
      min: 1,
    }),
  };

  public async run(): Promise<DeployResultJson> {
    const [{ flags }, cache] = await Promise.all([this.parse(DeployMetadataReport), DeployCache.create()]);
    const jobId = cache.resolveLatest(flags['use-most-recent'], flags['job-id'], false);

    const deployOpts = cache.maybeGet(jobId);
    const { wait } = flags;
    const org = deployOpts?.['target-org']
      ? await Org.create({ aliasOrUsername: deployOpts['target-org'] })
      : flags['target-org'];

    if (!org) {
      // if we don't find an org from flags, config, or the cache, throw an error
      throw messages.createError('noOrgError');
    }

    // if we're using mdapi we won't have a component set
    let componentSet = new ComponentSet();
    if (!deployOpts?.isMdapi) {
      if (!deployOpts) {
        // If the cache file isn't there, use the project package directories for the CompSet
        try {
          this.project = await SfProject.resolve();
          const sourcepath = this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
          componentSet = await buildComponentSet({ 'source-dir': sourcepath, wait });
        } catch (err) {
          // ignore the error. this was just to get improved command output.
        }
      } else if (deployOpts.status !== RequestStatus.Succeeded) {
        // if it's succeeded, the deployOpts can't be used to build a CS - nor do we need one
        componentSet = await buildComponentSet({ ...deployOpts, wait });
      }
    }
    const mdapiDeploy = new MetadataApiDeploy({
      // setting an API version here won't matter since we're just checking deploy status
      // eslint-disable-next-line sf-plugin/get-connection-with-version
      usernameOrConnection: org.getConnection(),
      id: jobId,
      components: componentSet,
      apiOptions: {
        rest: deployOpts?.api === API['REST'],
      },
    });

    const getDeployResult = async (): Promise<DeployResult> => {
      try {
        const deployStatus = await mdapiDeploy.checkStatus();
        return new DeployResult(deployStatus, componentSet);
      } catch (error) {
        if (error instanceof Error && error.name === 'sf:INVALID_CROSS_REFERENCE_KEY') {
          throw deployMessages.createError('error.InvalidDeployId', [jobId, org.getUsername()]);
        }
        throw error;
      }
    };

    let result: DeployResult;
    if (wait) {
      // poll for deploy results
      try {
        new DeployStages({
          title: 'Deploying Metadata',
          jsonEnabled: this.jsonEnabled(),
        }).start({ deploy: mdapiDeploy, username: org.getUsername() });
        result = await mdapiDeploy.pollStatus(500, wait.seconds);
      } catch (error) {
        if (error instanceof Error && error.message.includes('The client has timed out')) {
          this.debug('[project deploy report] polling timed out. Requesting status...');
        } else {
          throw error;
        }
      } finally {
        result = await getDeployResult();
      }
    } else {
      // check the deploy status
      result = await getDeployResult();
    }

    const formatter = new DeployReportResultFormatter(result, {
      ...deployOpts,
      ...flags,
      ...{ 'target-org': org },
    });

    if (!this.jsonEnabled()) formatter.display();

    return formatter.getJson();
  }
}
