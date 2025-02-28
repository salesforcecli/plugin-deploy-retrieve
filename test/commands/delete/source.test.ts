/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'node:fs';
import sinon from 'sinon';
import { expect } from 'chai';
import {
  ComponentSet,
  ComponentSetBuilder,
  ComponentSetOptions,
  RegistryAccess,
  SourceComponent,
} from '@salesforce/source-deploy-retrieve';
import { Lifecycle, SfProject } from '@salesforce/core';
import { fromStub, spyMethod, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { Config } from '@oclif/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { ComponentProperties } from '@salesforce/source-deploy-retrieve/lib/src/resolve/sourceComponent.js';
import { Source } from '../../../src/commands/project/delete/source.js';
import { DeployCache } from '../../../src/utils/deployCache.js';

export const exampleSourceComponent: ComponentProperties = {
  name: 'GeocodingService',
  type: {
    id: 'apexclass',
    name: 'ApexClass',
    suffix: 'cls',
    directoryName: 'classes',
    inFolder: false,
    strictDirectoryName: false,
    strategies: {
      adapter: 'matchingContentFile',
    },
  },
  xml: '/dreamhouse-lwc/force-app/main/default/classes/GeocodingService.cls-meta.xml',
  content: '/dreamhouse-lwc/force-app/main/default/classes/GeocodingService.cls',
};

const registry = new RegistryAccess();
const agentComponents: SourceComponent[] = [
  new SourceComponent({
    name: 'My_Agent',
    type: registry.getTypeByName('Bot'),
    xml: '/dreamhouse-lwc/force-app/main/default/bots/My_Agent.bot-meta.xml',
  }),
  new SourceComponent({
    name: 'Test_Planner',
    type: registry.getTypeByName('GenAiPlanner'),
    xml: '/dreamhouse-lwc/force-app/main/default/genAiPlanners/Test_Planner.genAiPlanner-meta.xml',
  }),
  new SourceComponent({
    name: 'Test_Plugin1',
    type: registry.getTypeByName('GenAiPlugin'),
    xml: '/dreamhouse-lwc/force-app/main/default/genAiPlugins/Test_Plugin1.genAiPlugin-meta.xml',
  }),
  new SourceComponent({
    name: 'Test_Plugin2',
    type: registry.getTypeByName('GenAiPlugin'),
    xml: '/dreamhouse-lwc/force-app/main/default/genAiPlugins/Test_Plugin2.genAiPlugin-meta.xml',
  }),
];

export const exampleDeleteResponse = {
  // required but ignored by the delete UT
  getFileResponses: (): void => {},
  response: {
    canceledBy: '0051h000006BHOq',
    canceledByName: 'User User',
    checkOnly: false,
    completedDate: '2021-04-09T20:23:05.000Z',
    createdBy: '0051h000006BHOq',
    createdByName: 'User User',
    createdDate: '2021-04-09T20:22:58.000Z',
    details: {
      componentSuccesses: [
        {
          changed: 'false',
          componentType: 'CustomField',
          created: 'false',
          createdDate: '2021-04-09T20:23:02.000Z',
          deleted: 'false',
          fileName: 'sdx_sourceDeploy_pkg_1617999776176/objects/Property__c.object',
          fullName: 'Property__c.Picture__c',
          id: '00N1h00000ApoBMEAZ',
          success: 'true',
        },
        {
          changed: 'false',
          componentType: 'CustomField',
          created: 'false',
          createdDate: '2021-04-09T20:23:02.000Z',
          deleted: 'false',
          fileName: 'sdx_sourceDeploy_pkg_1617999776176/objects/Property__c.object',
          fullName: 'Property__c.Baths__c',
          id: '00N1h00000ApoAuEAJ',
          success: 'true',
        },
      ],
      runTestResult: {
        numFailures: '0',
        numTestsRun: '0',
        totalTime: '0.0',
      },
    },
    done: true,
    id: '0Af1h00000fCQgsCAG',
    ignoreWarnings: false,
    lastModifiedDate: '2021-04-09T20:23:05.000Z',
    numberComponentErrors: 0,
    numberComponentsDeployed: 32,
    numberComponentsTotal: 86,
    numberTestErrors: 0,
    numberTestsCompleted: 5,
    numberTestsTotal: 10,
    rollbackOnError: true,
    runTestsEnabled: false,
    startDate: '2021-04-09T20:22:58.000Z',
    status: 'Succeeded',
    success: true,
  },
  status: 0,
};

describe('project delete source', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  testOrg.username = 'delete-test@org.com';
  const defaultPackagePath = 'defaultPackagePath';
  const confirm = true;

  const oclifConfigStub = fromStub(
    stubInterface<Config>($$.SANDBOX, { runHook: async () => ({ failures: [], successes: [] }) })
  );

  // Stubs
  let buildComponentSetStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;
  let resolveProjectConfigStub: sinon.SinonStub;
  let rmStub: sinon.SinonStub;
  let compSetFromSourceStub: sinon.SinonStub;
  let confirmStub: sinon.SinonStub;
  let handlePromptStub: sinon.SinonStub;

  class TestDelete extends Source {
    public async runIt() {
      await this.init();
      // oclif would normally populate this, but UT don't have it
      this.id ??= 'force:source:delete';
      return this.run();
    }
  }

  const runDeleteCmd = async (
    params: string[],
    options?: {
      sourceApiVersion?: string;
      confirm?: boolean;
    }
  ) => {
    const cmd = new TestDelete(params, oclifConfigStub);
    cmd.project = SfProject.getInstance();
    $$.SANDBOX.stub(cmd.project, 'getDefaultPackage').returns({ name: '', path: '', fullPath: defaultPackagePath });
    $$.SANDBOX.stub(cmd.project, 'getUniquePackageDirectories').returns([
      { fullPath: defaultPackagePath, path: '', name: '' },
    ]);
    $$.SANDBOX.stub(cmd.project, 'getPackageDirectories').returns([
      { fullPath: defaultPackagePath, path: '', name: '' },
    ]);
    $$.SANDBOX.stub(cmd.project, 'resolveProjectConfig').resolves({ sourceApiVersion: options?.sourceApiVersion });

    stubMethod($$.SANDBOX, SfCommand.prototype, 'log');
    stubMethod($$.SANDBOX, ComponentSet.prototype, 'deploy').resolves({
      id: '123',
      pollStatus: () => exampleDeleteResponse,
      onUpdate: () => {},
      onFinish: () => {
        exampleDeleteResponse;
      },
      onCancel: () => {},
      onError: () => {},
    });
    confirmStub = stubMethod($$.SANDBOX, cmd, 'confirm').returns(options?.confirm ?? true);
    handlePromptStub = stubMethod($$.SANDBOX, cmd, 'handlePrompt').returns(confirm);
    rmStub = stubMethod($$.SANDBOX, fs.promises, 'rm').resolves();
    stubMethod($$.SANDBOX, DeployCache, 'update').resolves();

    return cmd.runIt();
  };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });

    resolveProjectConfigStub = $$.SANDBOX.stub();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      toArray: () => [new SourceComponent(exampleSourceComponent)],
    });
    const lifecycle = Lifecycle.getInstance();
    lifecycleEmitStub = $$.SANDBOX.stub(lifecycle, 'emit');

    compSetFromSourceStub = stubMethod($$.SANDBOX, ComponentSet, 'fromSource').returns({
      toArray: () => [new SourceComponent(exampleSourceComponent)],
    });
  });

  afterEach(() => {
    $$.restore();
    $$.SANDBOX.restore();
  });

  // Ensure SourceCommand.createComponentSet() args
  const ensureCreateComponentSetArgs = (overrides?: Partial<ComponentSetOptions>) => {
    const defaultArgs = {
      sourcepath: undefined,
      metadata: undefined,
      apiversion: undefined,
      sourceapiversion: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(buildComponentSetStub.calledOnce).to.equal(true);
    expect(buildComponentSetStub.firstCall.args[0]).to.deep.include(expectedArgs);
  };

  // Ensure Lifecycle hooks are called properly
  const ensureHookArgs = () => {
    const failureMsg = 'Lifecycle.emit() should be called for predeploy and postdeploy';
    expect(lifecycleEmitStub.calledTwice, failureMsg).to.equal(true);
    expect(lifecycleEmitStub.firstCall.args[0]).to.equal('predeploy');
    expect(lifecycleEmitStub.secondCall.args[0]).to.equal('postdeploy');
  };

  it('should pass along sourcepath', async () => {
    const sourcepath = ['somepath'];
    await runDeleteCmd(['--sourcepath', sourcepath[0], '--json', '-r']);
    ensureCreateComponentSetArgs({ sourcepath });
    ensureHookArgs();
    // deleting the component and its xml
    expect(rmStub.callCount).to.equal(2);
  });

  it('should warn if everything is forceignored', async () => {
    buildComponentSetStub.restore();
    const warnSpy = spyMethod($$.SANDBOX, SfCommand.prototype, 'warn');
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      forceIgnoredPaths: new Set<string>('myPath'),
      toArray: () => [],
    });
    await runDeleteCmd(['--metadata', 'ApexClass:MyClass', '--json', '-r']);
    expect(warnSpy.calledOnce).to.be.true;
  });

  it('should pass along metadata', async () => {
    const metadata = ['ApexClass:MyClass'];
    await runDeleteCmd(['--metadata', metadata[0], '--json', '-r']);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureHookArgs();
  });

  it('should pass along metadata and org for pseudo-type matching with plugins', async () => {
    const agentCompSet = new ComponentSet();
    agentComponents.map((comp) => agentCompSet.add(comp));
    compSetFromSourceStub = compSetFromSourceStub.returns(agentCompSet);
    const metadata = ['Agent:My_Agent'];
    await runDeleteCmd(['--metadata', metadata[0], '--json']);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
      org: {
        username: testOrg.username,
        exclude: [],
      },
    });
    ensureHookArgs();
    expect(compSetFromSourceStub.calledOnce).to.be.true;
    expect(confirmStub.calledOnce).to.be.true;
    expect(confirmStub.firstCall.firstArg)
      .has.deep.property('message')
      .that.includes('Do you want to delete ALL related topics?')
      .and.includes(agentComponents[2].xml)
      .and.includes(agentComponents[3].xml);
    expect(handlePromptStub.calledOnce).to.be.true;
    expect(lifecycleEmitStub.firstCall.args[1]).to.deep.equal(agentComponents);
  });

  it('should pass along metadata and org for pseudo-type matching without plugins', async () => {
    const agentCompSet = new ComponentSet();
    agentComponents.map((comp) => agentCompSet.add(comp));
    compSetFromSourceStub = compSetFromSourceStub.returns(agentCompSet);
    const metadata = ['Agent:My_Agent'];
    await runDeleteCmd(['--metadata', metadata[0], '--json'], { confirm: false });
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
      org: {
        username: testOrg.username,
        exclude: [],
      },
    });
    ensureHookArgs();
    expect(compSetFromSourceStub.calledOnce).to.be.true;
    expect(confirmStub.calledOnce).to.be.true;
    expect(confirmStub.firstCall.firstArg)
      .has.deep.property('message')
      .that.includes('Do you want to delete ALL related topics?')
      .and.includes(agentComponents[2].xml)
      .and.includes(agentComponents[3].xml);
    expect(handlePromptStub.calledOnce).to.be.true;
    expect(lifecycleEmitStub.firstCall.args[1]).to.deep.equal([agentComponents[0], agentComponents[1]]);
  });

  it('should pass along apiversion', async () => {
    const metadata = ['ApexClass:MyClass'];

    await runDeleteCmd(['--metadata', metadata[0], '--json', '-r', '--apiversion', '52.0']);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
      apiversion: '52.0',
    });
    ensureHookArgs();
  });

  it('should pass along sourceapiversion', async () => {
    const sourceApiVersion = '50.0';
    const metadata = ['ApexClass:MyClass'];

    resolveProjectConfigStub.resolves({ sourceApiVersion });

    await runDeleteCmd(['--metadata', metadata[0], '--json', '-r'], { sourceApiVersion });
    ensureCreateComponentSetArgs({
      sourceapiversion: sourceApiVersion,
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureHookArgs();
  });
});
