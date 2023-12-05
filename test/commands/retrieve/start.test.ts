/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sinon from 'sinon';
import { expect } from 'chai';
import {
  ComponentLike,
  ComponentSet,
  ComponentSetBuilder,
  ComponentSetOptions,
  MetadataType,
  RequestStatus,
  RetrieveOptions,
} from '@salesforce/source-deploy-retrieve';
import { Messages, SfProject } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { stubSfCommandUx, stubSpinner, stubUx } from '@salesforce/sf-plugins-core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup.js';
import oclifUtils from '@oclif/core/lib/util/fs.js';
import { RetrieveResultFormatter } from '../../../src/formatters/retrieveResultFormatter.js';
import { getRetrieveResult } from '../../utils/retrieveResponse.js';
import { RetrieveResultJson } from '../../../src/utils/types.js';
import { exampleSourceComponent } from '../../utils/testConsts.js';
import RetrieveMetadata from '../../../src/commands/project/retrieve/start.js';

Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'retrieve.start');

describe('project retrieve start', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  let sfCommandUxStubs: ReturnType<typeof stubSfCommandUx>;

  testOrg.username = 'retrieve-test@org.com';
  const packageXml = 'package.xml';
  const defaultPackagePath = 'defaultPackagePath';
  const retrieveResult = getRetrieveResult('success');
  const expectedResults: RetrieveResultJson = {
    fileProperties: retrieveResult.response.fileProperties,
    id: '09S21000002jxznEAA',
    status: RequestStatus.Succeeded,
    success: true,
    done: true,
    files: retrieveResult.getFileResponses(),
  };

  // Stubs
  let buildComponentSetStub: sinon.SinonStub;
  let retrieveStub: sinon.SinonStub;
  let pollStub: sinon.SinonStub;
  let expectedDirectoryPath: string;

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });

    // the 2 oclif flags should act as if the dir/file is there and ok
    $$.SANDBOX.stub(oclifUtils, 'fileExists').callsFake((p: string) => Promise.resolve(p));
    $$.SANDBOX.stub(oclifUtils, 'dirExists').callsFake((p: string) => Promise.resolve(p));

    sfCommandUxStubs = stubSfCommandUx($$.SANDBOX);
    stubUx($$.SANDBOX);
    stubSpinner($$.SANDBOX);
    $$.setConfigStubContents('SfProjectJson', {
      contents: {
        packageDirectories: [
          {
            path: defaultPackagePath,
            fullPath: defaultPackagePath,
            default: true,
          },
        ],
      },
    });
    expectedDirectoryPath = SfProject.getInstance().getDefaultPackage().fullPath;

    pollStub = $$.SANDBOX.stub().resolves(retrieveResult);
    retrieveStub = $$.SANDBOX.stub().resolves({
      onUpdate: pollStub,
      onFinish: pollStub,
      pollStatus: pollStub,
      onCancel: () => {},
      onError: () => {},
      retrieveId: retrieveResult.response.id,
    });
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
      has: () => false,
    });
  });

  // Ensure SourceCommand.createComponentSet() args
  const ensureCreateComponentSetArgs = (overrides?: Partial<ComponentSetOptions>) => {
    const defaultArgs = {
      packagenames: undefined,
      sourcepath: undefined,
      manifest: undefined,
      metadata: undefined,
      apiversion: undefined,
      sourceapiversion: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(buildComponentSetStub.calledOnce).to.equal(true);
    expect(JSON.parse(JSON.stringify(buildComponentSetStub.firstCall.args[0]))).to.deep.equal(
      JSON.parse(JSON.stringify(expectedArgs))
    );
  };

  // Ensure ComponentSet.retrieve() args
  const ensureRetrieveArgs = (overrides?: Partial<RetrieveOptions>) => {
    const defaultRetrieveArgs = {
      usernameOrConnection: testOrg.username,
      merge: true,
      output: SfProject.getInstance().getDefaultPackage().fullPath,
      packageOptions: undefined,
    };
    const expectedRetrieveArgs = { ...defaultRetrieveArgs, ...overrides };

    expect(retrieveStub.calledOnce).to.equal(true);
    expect(retrieveStub.firstCall.args[0]).to.deep.equal(expectedRetrieveArgs);
  };

  it('should pass along sourcepath', async () => {
    const sourcepath = ['somepath'];
    const result = await RetrieveMetadata.run(['--source-dir', sourcepath[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({ sourcepath });
    ensureRetrieveArgs({ format: 'source' });
  });
  it('should pass along retrievetargetdir', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const renameStub = $$.SANDBOX.stub(RetrieveMetadata.prototype, 'moveResultsForRetrieveTargetDir').resolves();

    const sourcepath = ['somepath'];
    const metadata = ['ApexClass:MyClass'];
    const result = await RetrieveMetadata.run(['--output-dir', sourcepath[0], '--metadata', metadata[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      sourcepath: undefined,
      metadata: {
        directoryPaths: [],
        metadataEntries: ['ApexClass:MyClass'],
      },
    });
    ensureRetrieveArgs({ output: resolve(sourcepath[0]), format: 'source' });
    expect(renameStub.calledOnce).to.be.true;
  });

  it('should pass along metadata', async () => {
    const metadata = ['ApexClass:MyClass'];
    const result = await RetrieveMetadata.run(['--metadata', metadata[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs({ format: 'source' });
  });

  it('should pass along metadata and org for wildcard matching', async () => {
    const metadata = ['ApexClass:MyC*'];
    const result = await RetrieveMetadata.run(['--metadata', metadata[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [expectedDirectoryPath],
      },
      org: {
        username: testOrg.username,
        exclude: [],
      },
    });
    ensureRetrieveArgs({ format: 'source' });
  });

  it('should pass along manifest', async () => {
    const manifest = 'package.xml';
    const result = await RetrieveMetadata.run(['--manifest', manifest, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs({ format: 'source' });
  });

  it('should pass along apiversion', async () => {
    const manifest = 'package.xml';
    const apiversion = '50.0';
    const result = await RetrieveMetadata.run(['--manifest', manifest, '--api-version', apiversion, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      apiversion,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs({ format: 'source' });
  });

  it('should pass along sourceapiversion', async () => {
    const sourceApiVersion = '50.0';
    const manifest = 'package.xml';
    $$.SANDBOX.stub(SfProject.prototype, 'resolveProjectConfig').resolves({ sourceApiVersion });
    const result = await RetrieveMetadata.run(['--manifest', manifest, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      sourceapiversion: sourceApiVersion,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs({ format: 'source' });
  });

  it('should pass along packagenames', async () => {
    const manifest = 'package.xml';
    const packagenames = ['package1'];
    await RetrieveMetadata.run(['--manifest', manifest, '--package-name', packagenames[0], '--json']);
    ensureCreateComponentSetArgs({
      packagenames,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs({ packageOptions: packagenames, format: 'source' });
  });

  it('should pass along multiple packagenames', async () => {
    const manifest = 'package.xml';
    const packagenames = ['package1', 'package2'];
    const result = await RetrieveMetadata.run([
      '--manifest',
      manifest,
      '--package-name',
      'package1',
      '--package-name',
      'package2',
      '--json',
    ]);

    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      packagenames,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs({ packageOptions: packagenames, format: 'source' });
  });

  it('should display output with no --json', async () => {
    const displayStub = $$.SANDBOX.stub(RetrieveResultFormatter.prototype, 'display');
    const getJsonStub = $$.SANDBOX.stub(RetrieveResultFormatter.prototype, 'getJson');
    await RetrieveMetadata.run(['--source-dir', 'somepath']);
    expect(displayStub.calledOnce).to.equal(true);
    expect(getJsonStub.calledOnce).to.equal(true);
  });

  it('should NOT display output with --json', async () => {
    const displayStub = $$.SANDBOX.stub(RetrieveResultFormatter.prototype, 'display');
    const getJsonStub = $$.SANDBOX.stub(RetrieveResultFormatter.prototype, 'getJson');
    await RetrieveMetadata.run(['--source-dir', 'somepath', '--json']);
    expect(displayStub.calledOnce).to.equal(false);
    expect(getJsonStub.calledOnce).to.equal(true);
  });

  it('should warn users when retrieving CustomField with --metadata', async () => {
    const metadata = 'CustomField';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.include({ id: 'customobject', name: 'CustomObject' });
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
      },
      has: (component: ComponentLike) => {
        expect(component).to.be.a('object').and.to.have.property('type');
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
        const type = component.type as MetadataType;
        if (type.name === 'CustomField') {
          return true;
        }
        if (type.name === 'CustomObject') {
          return false;
        }
      },
    });
    await RetrieveMetadata.run(['--metadata', metadata]);
    expect(sfCommandUxStubs.warn.called).to.be.true;
    expect(
      sfCommandUxStubs.warn
        .getCalls()
        .flatMap((call) => call.args)
        .includes(messages.getMessage('wantsToRetrieveCustomFields'))
    );
  });

  it('should not warn users when retrieving CustomField,CustomObject with --metadata', async () => {
    const metadata = 'CustomField,CustomObject';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.equal({ id: 'customobject', name: 'CustomObject' });
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
      },
      has: (component: ComponentLike) => {
        expect(component).to.be.a('object').and.to.have.property('type');
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
        const type = component.type as MetadataType;
        if (type.name === 'CustomField') {
          return true;
        }
        if (type.name === 'CustomObject') {
          return true;
        }
      },
    });
    await RetrieveMetadata.run(['--metadata', metadata]);
    expect(sfCommandUxStubs.warn.called).to.be.false;
  });

  it('should warn users when retrieving CustomField with --manifest', async () => {
    const manifest = 'package.xml';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.include({ id: 'customobject', name: 'CustomObject' });
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
      },
      has: (component: ComponentLike) => {
        expect(component).to.be.a('object').and.to.have.property('type');
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
        const type = component.type as MetadataType;
        if (type.name === 'CustomField') {
          return true;
        }
        if (type.name === 'CustomObject') {
          return false;
        }
      },
    });
    await RetrieveMetadata.run(['--manifest', manifest]);
    expect(sfCommandUxStubs.warn.called).to.be.true;
    expect(
      sfCommandUxStubs.warn
        .getCalls()
        .flatMap((call) => call.args)
        .includes(messages.getMessage('wantsToRetrieveCustomFields'))
    );
  });

  it('should not be warn users when retrieving CustomField,CustomObject with --manifest', async () => {
    const manifest = 'package.xml';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.equal({ id: 'customobject', name: 'CustomObject' });
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
      },
      has: (component: ComponentLike) => {
        expect(component).to.be.a('object').and.to.have.property('type');
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
        const type = component.type as MetadataType;
        if (type.name === 'CustomField') {
          return true;
        }
        if (type.name === 'CustomObject') {
          return true;
        }
      },
    });
    await RetrieveMetadata.run(['--manifest', manifest]);
    expect(sfCommandUxStubs.warn.called).to.be.false;
  });
});
