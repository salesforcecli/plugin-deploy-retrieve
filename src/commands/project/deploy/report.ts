/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org, SfProject } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { ComponentSet, DeployResult, MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { buildComponentSet } from '../../../utils/deploy';
import { DeployProgress } from '../../../utils/progressBar';
import { DeployCache } from '../../../utils/deployCache';
import { DeployReportResultFormatter } from '../../../formatters/deployReportResultFormatter';
import { DeployResultJson } from '../../../utils/types';
import { coverageFormattersFlag } from '../../../utils/flags';

Messages.importMessagesDirectory(__dirname);
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
    'target-org': Flags.optionalOrg({
      char: 'o',
      description: deployMessages.getMessage('flags.target-org.description'),
      summary: deployMessages.getMessage('flags.target-org.summary'),
    }),
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
    'coverage-formatters': { ...coverageFormattersFlag, helpGroup: testFlags },
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

    const deployOpts = cache.get(jobId) ?? {};
    const waitDuration = flags['wait'];
    const org = flags['target-org'] ?? (await Org.create({ aliasOrUsername: deployOpts['target-org'] }));

    // if we're using mdapi we won't have a component set
    let componentSet = new ComponentSet();
    if (!deployOpts.isMdapi) {
      if (!cache.get(jobId)) {
        // If the cache file isn't there, use the project package directories for the CompSet
        try {
          this.project = await SfProject.resolve();
          const sourcepath = this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
          componentSet = await buildComponentSet({ 'source-dir': sourcepath, wait: waitDuration });
        } catch (err) {
          // ignore the error. this was just to get improved command output.
        }
      } else {
        componentSet = await buildComponentSet({ ...deployOpts, wait: waitDuration });
      }
    }
    const mdapiDeploy = new MetadataApiDeploy({
      // setting an API version here won't matter since we're just checking deploy status
      // eslint-disable-next-line sf-plugin/get-connection-with-version
      usernameOrConnection: org.getConnection(),
      id: jobId,
      components: componentSet,
      apiOptions: {
        rest: deployOpts.api === 'REST',
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
    if (waitDuration) {
      // poll for deploy results
      try {
        new DeployProgress(mdapiDeploy, this.jsonEnabled()).start();
        result = await mdapiDeploy.pollStatus(500, waitDuration.seconds);
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
