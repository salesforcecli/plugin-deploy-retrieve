/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EnvironmentVariable, Lifecycle, Messages, OrgConfigProperties, SfError } from '@salesforce/core';
import { DeployVersionData, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { SfCommand, toHelpSection, Flags } from '@salesforce/sf-plugins-core';
import { SourceConflictError, SourceMemberPollingEvent } from '@salesforce/source-tracking';
import { AsyncDeployResultFormatter } from '../../../formatters/asyncDeployResultFormatter.js';
import { DeployResultFormatter } from '../../../formatters/deployResultFormatter.js';
import { DeployResultJson, TestLevel } from '../../../utils/types.js';
import { executeDeploy, resolveApi, validateTests, determineExitCode } from '../../../utils/deploy.js';
import { DeployCache } from '../../../utils/deployCache.js';
import { DEPLOY_STATUS_CODES_DESCRIPTIONS } from '../../../utils/errorCodes.js';
import { ConfigVars } from '../../../configMeta.js';
import { coverageFormattersFlag, fileOrDirFlag, testLevelFlag, testsFlag } from '../../../utils/flags.js';
import { writeConflictTable } from '../../../utils/conflicts.js';
import { getOptionalProject } from '../../../utils/project.js';
import { MultiStageComponent } from '../../../components/stages.js';
import { round } from '../../../components/utils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'deploy.metadata');
const mdTransferMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'metadata.transfer');

const exclusiveFlags = ['manifest', 'source-dir', 'metadata', 'metadata-dir'];
const mdapiFormatFlags = 'Metadata API Format';
const sourceFormatFlags = 'Source Format';
const testFlags = 'Test';
const destructiveFlags = 'Delete';

export default class DeployMetadata extends SfCommand<DeployResultJson> {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly aliases = ['deploy:metadata'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'api-version': Flags.orgApiVersion({
      char: 'a',
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
    }),
    async: Flags.boolean({
      summary: messages.getMessage('flags.async.summary'),
      description: messages.getMessage('flags.async.description'),
      exclusive: ['wait'],
    }),
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
      exclusive: ['verbose'],
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      default: false,
    }),
    'ignore-conflicts': Flags.boolean({
      char: 'c',
      summary: messages.getMessage('flags.ignore-conflicts.summary'),
      description: messages.getMessage('flags.ignore-conflicts.description'),
      default: false,
    }),
    'ignore-errors': Flags.boolean({
      char: 'r',
      summary: messages.getMessage('flags.ignore-errors.summary'),
      description: messages.getMessage('flags.ignore-errors.description'),
      default: false,
    }),
    'ignore-warnings': Flags.boolean({
      char: 'g',
      summary: messages.getMessage('flags.ignore-warnings.summary'),
      description: messages.getMessage('flags.ignore-warnings.description'),
      default: false,
    }),
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exclusive: exclusiveFlags.filter((f) => f !== 'manifest'),
      exists: true,
      helpGroup: sourceFormatFlags,
    }),
    metadata: Flags.string({
      char: 'm',
      summary: messages.getMessage('flags.metadata.summary'),
      multiple: true,
      exclusive: exclusiveFlags.filter((f) => f !== 'metadata'),
      helpGroup: sourceFormatFlags,
    }),
    'metadata-dir': fileOrDirFlag({
      summary: messages.getMessage('flags.metadata-dir.summary'),
      exclusive: exclusiveFlags.filter((f) => f !== 'metadata-dir'),
      exists: true,
      helpGroup: mdapiFormatFlags,
    }),
    'single-package': Flags.boolean({
      summary: messages.getMessage('flags.single-package.summary'),
      dependsOn: ['metadata-dir'],
      helpGroup: mdapiFormatFlags,
    }),
    'source-dir': Flags.string({
      char: 'd',
      description: messages.getMessage('flags.source-dir.description'),
      summary: messages.getMessage('flags.source-dir.summary'),
      multiple: true,
      exclusive: exclusiveFlags.filter((f) => f !== 'source-dir'),
      helpGroup: sourceFormatFlags,
    }),
    'target-org': Flags.requiredOrg(),
    tests: testsFlag({ helpGroup: testFlags }),
    'test-level': testLevelFlag({
      description: messages.getMessage('flags.test-level.description'),
      summary: messages.getMessage('flags.test-level.summary'),
      options: [TestLevel.NoTestRun, TestLevel.RunSpecifiedTests, TestLevel.RunLocalTests, TestLevel.RunAllTestsInOrg],
      helpGroup: testFlags,
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
      exclusive: ['concise'],
    }),
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
      unit: 'minutes',
      default: Duration.minutes(33),
      helpValue: '<minutes>',
      min: 1,
      exclusive: ['async'],
    }),
    'purge-on-delete': Flags.boolean({
      summary: messages.getMessage('flags.purge-on-delete.summary'),
      relationships: [
        { type: 'some', flags: ['pre-destructive-changes', 'manifest', 'metadata-dir', 'post-destructive-changes'] },
      ],
      helpGroup: destructiveFlags,
    }),
    'pre-destructive-changes': Flags.file({
      summary: messages.getMessage('flags.pre-destructive-changes.summary'),
      dependsOn: ['manifest'],
      helpGroup: destructiveFlags,
    }),
    'post-destructive-changes': Flags.file({
      summary: messages.getMessage('flags.post-destructive-changes.summary'),
      dependsOn: ['manifest'],
      helpGroup: destructiveFlags,
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
  };

  public static configurationVariablesSection = toHelpSection(
    'CONFIGURATION VARIABLES',
    OrgConfigProperties.TARGET_ORG,
    OrgConfigProperties.ORG_API_VERSION,
    ConfigVars.ORG_METADATA_REST_DEPLOY
  );

  public static envVariablesSection = toHelpSection(
    'ENVIRONMENT VARIABLES',
    EnvironmentVariable.SF_TARGET_ORG,
    EnvironmentVariable.SF_USE_PROGRESS_BAR
  );

  public static errorCodes = toHelpSection('ERROR CODES', DEPLOY_STATUS_CODES_DESCRIPTIONS);

  public async run(): Promise<DeployResultJson> {
    const { flags } = await this.parse(DeployMetadata);
    const project = await getOptionalProject();

    if (
      project?.getSfProjectJson().getContents()['pushPackageDirectoriesSequentially'] &&
      // flag exclusivity is handled correctly above - but to avoid short-circuiting the check, we need to check all of them
      !flags.manifest &&
      !flags.metadata &&
      !flags['source-dir']
    ) {
      // if pushPackageDirectoriesSequentially = true, and they're not using any of the flags that would modify their deploy
      // e.g. they're recreating a `source:push` command, which is the only one that respects this config value, warn them about it not working like it used to
      this.warn(messages.getMessage('pushPackageDirsWarning'));
    }
    if (!validateTests(flags['test-level'], flags.tests)) {
      throw messages.createError('error.NoTestsSpecified');
    }

    const api = await resolveApi(this.configAggregator);
    const username = flags['target-org'].getUsername();
    const title = flags['dry-run'] ? 'Deploying Metadata (dry-run)' : 'Deploying Metadata';

    const ms = new MultiStageComponent<{
      mdapiDeploy: MetadataApiDeployStatus;
      sourceMemberPolling: SourceMemberPollingEvent;
      status: string;
      apiData: DeployVersionData;
      targetOrg: string;
    }>({
      title,
      stages: ['Preparing', 'Deploying Metadata', 'Running Tests', 'Updating Source Tracking', 'Done'],
      jsonEnabled: this.jsonEnabled(),
      preStagesBlock: [
        {
          type: 'message',
          get: (data) =>
            data?.apiData &&
            messages.getMessage('apiVersionMsgDetailed', [
              flags['dry-run'] ? 'Deploying (dry-run)' : 'Deploying',
              // technically manifestVersion can be undefined, but only on raw mdapi deployments.
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              flags['metadata-dir'] ? '<version specified in manifest>' : `v${data.apiData.manifestVersion}`,
              username,
              data.apiData.apiVersion,
              data.apiData.webService,
            ]),
        },
      ],
      postStagesBlock: [
        {
          label: 'Status',
          get: (data) => data?.mdapiDeploy && mdTransferMessages.getMessage(data?.mdapiDeploy?.status),
          bold: true,
          type: 'dynamic-key-value',
        },
        {
          label: 'Deploy ID',
          get: (data) => data?.mdapiDeploy?.id,
          type: 'static-key-value',
        },
        {
          label: 'Target Org',
          get: (data) => data?.targetOrg,
          type: 'static-key-value',
        },
      ],
      stageSpecificBlock: [
        {
          label: 'Components',
          get: (data) =>
            data?.mdapiDeploy?.numberComponentsTotal
              ? `${data?.mdapiDeploy?.numberComponentsDeployed}/${data?.mdapiDeploy?.numberComponentsTotal} (${round(
                  (data?.mdapiDeploy?.numberComponentsDeployed / data?.mdapiDeploy?.numberComponentsTotal) * 100,
                  0
                )}%)`
              : undefined,
          stage: 'Deploying Metadata',
          type: 'dynamic-key-value',
        },
        {
          label: 'Tests',
          get: (data) =>
            data?.mdapiDeploy?.numberTestsTotal && data?.mdapiDeploy?.numberTestsCompleted
              ? `${data?.mdapiDeploy?.numberTestsCompleted ?? 0}/${data?.mdapiDeploy?.numberTestsTotal ?? 0} ${
                  data?.mdapiDeploy?.numberTestErrors ? `(Errors: ${data?.mdapiDeploy?.numberTestErrors})` : ''
                }`
              : undefined,
          stage: 'Running Tests',
          type: 'dynamic-key-value',
        },
        {
          label: 'Members',
          get: (data) =>
            data?.sourceMemberPolling &&
            `${data.sourceMemberPolling.original - data.sourceMemberPolling.remaining}/${
              data.sourceMemberPolling.original
            }`,
          stage: 'Updating Source Tracking',
          type: 'dynamic-key-value',
        },
      ],
    });

    const lifecycle = Lifecycle.getInstance();
    lifecycle.on('apiVersionDeploy', async (apiData: DeployVersionData) => Promise.resolve(ms.updateData({ apiData })));

    const { deploy } = await executeDeploy(
      {
        ...flags,
        'target-org': username,
        api,
      },
      project
    );

    if (!deploy) {
      ms.stop();
      this.log('No changes to deploy');
      return { status: 'Nothing to deploy', files: [] };
    }

    if (!deploy.id) {
      throw new SfError('The deploy id is not available.');
    }
    // this.log(`Deploy ID: ${ansis.bold(deploy.id)}`);

    if (flags.async) {
      if (flags['coverage-formatters']) {
        this.warn(messages.getMessage('asyncCoverageJunitWarning'));
      }
      const asyncFormatter = new AsyncDeployResultFormatter(deploy.id);
      if (!this.jsonEnabled()) asyncFormatter.display();
      return asyncFormatter.getJson();
    }

    ms.goto('Preparing', { targetOrg: username });

    // for sourceMember polling events
    lifecycle.on<SourceMemberPollingEvent>('sourceMemberPollingEvent', (event: SourceMemberPollingEvent) =>
      Promise.resolve(ms.goto('Updating Source Tracking', { sourceMemberPolling: event }))
    );

    deploy.onUpdate((data) => {
      if (
        data.numberComponentsDeployed === data.numberComponentsTotal &&
        data.numberTestsTotal > 0 &&
        data.numberComponentsDeployed > 0
      ) {
        ms.goto('Running Tests', { mdapiDeploy: data });
      } else {
        ms.goto('Deploying Metadata', { mdapiDeploy: data });
      }
    });

    deploy.onFinish((data) => {
      ms.goto('Done', { mdapiDeploy: data.response, status: mdTransferMessages.getMessage(data.response.status) });
      ms.stop();
    });

    deploy.onCancel(() => ms.stop());

    deploy.onError((error: Error) => {
      ms.stop();
      throw error;
    });

    const result = await deploy.pollStatus({ timeout: flags.wait });
    process.exitCode = determineExitCode(result);
    const formatter = new DeployResultFormatter(result, flags);

    if (!this.jsonEnabled()) {
      formatter.display();
      if (flags['dry-run']) this.logSuccess('Dry-run complete.');
    }

    await DeployCache.update(deploy.id, { status: result.response.status });

    return formatter.getJson();
  }

  protected catch(error: Error | SfError): Promise<never> {
    if (error instanceof SourceConflictError && error.data) {
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
    if (error.message.includes('client has timed out')) {
      const err = messages.createError('error.ClientTimeout');
      return super.catch({
        ...error,
        name: err.name,
        message: err.message,
        ...(typeof err.code === 'string' || typeof err.code === 'number' ? { code: err.code } : {}),
      });
    }
    return super.catch(error);
  }
}
