/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { join, resolve, sep } from 'node:path';
import fs from 'node:fs/promises';
import { Stats } from 'node:fs';
import { ComponentSetBuilder, ComponentSetOptions, MetadataConverter } from '@salesforce/source-deploy-retrieve';
import sinon from 'sinon';
import { expect } from 'chai';
import { stubMethod, stubInterface } from '@salesforce/ts-sinon';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { SfProject } from '@salesforce/core';
import { Source } from '../../../src/commands/project/convert/source.js';

describe('project convert source', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  let buildComponentSetStub: sinon.SinonStub;

  const defaultDir = join('my', 'default', 'package');
  // the test is using fs that's in the os temp dir
  const projectDir = `${join($$.localPathRetrieverSync($$.id), defaultDir)}${sep}`;
  const myApp = join('new', 'package', 'directory');
  const packageXml = 'package.xml';

  // Ensure correct ComponentSetBuilder options
  const ensureCreateComponentSetArgs = (overrides?: Partial<ComponentSetOptions>) => {
    const defaultArgs = {
      sourcepath: [],
      manifest: undefined,
      metadata: undefined,
      sourceapiversion: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(buildComponentSetStub.calledOnce).to.equal(true);
    expect(buildComponentSetStub.firstCall.args[0]).to.deep.include(expectedArgs);
  };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    // TODO: move this to TestSetup
    // @ts-expect-error accessing a private property
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    SfProject.instances.clear();
    stubSfCommandUx($$.SANDBOX);
    // the 2 oclif flags should act as if the dir/file is there and ok
    $$.SANDBOX.stub(fs, 'stat').resolves(
      stubInterface<Stats>($$.SANDBOX, {
        isDirectory: () => true,
        isFile: () => true,
      })
    );

    $$.setConfigStubContents('SfProjectJson', {
      contents: {
        packageDirectories: [{ path: defaultDir, default: true }],
      },
    });
    $$.SANDBOX.stub(MetadataConverter.prototype, 'convert').resolves({ packagePath: 'temp' });
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      deploy: sinon.stub(),
      getPackageXml: () => packageXml,
    });
  });

  afterEach(() => {
    $$.restore();
  });

  it('should pass along sourcepath', async () => {
    const sourcepath = 'somepath';
    const result = await Source.run(['--sourcepath', sourcepath, '--json']);
    // const result = await runConvertCmd(['--sourcepath', sourcepath, '--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [sourcepath] });
  });

  it('should pass along sourceApiVersion', async () => {
    const sourceApiVersion = '50.0';
    $$.setConfigStubContents('SfProjectJson', {
      contents: {
        packageDirectories: [{ path: defaultDir, default: true }],
        sourceApiVersion,
      },
    });

    const result = await Source.run(['--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({
      sourcepath: [defaultDir],
      sourceapiversion: sourceApiVersion,
    });
  });

  it('should call default package dir if no args', async () => {
    const result = await Source.run(['--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [defaultDir] });
  });

  it('should call with metadata', async () => {
    const metadata = 'ApexClass';
    const result = await Source.run(['--metadata', metadata, '--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: [metadata],
        directoryPaths: [projectDir],
      },
    });
  });

  it('should call with package.xml', async () => {
    const result = await Source.run(['--manifest', packageXml, '--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({
      manifest: {
        manifestPath: packageXml,
        directoryPaths: [projectDir],
      },
    });
  });

  it('should call root dir with rootdir flag', async () => {
    const result = await Source.run(['--rootdir', myApp, '--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [myApp] });
  });

  describe('rootdir should be overwritten by any other flag', () => {
    it('sourcepath', async () => {
      const result = await Source.run(['--rootdir', myApp, '--sourcepath', defaultDir, '--json']);
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({ sourcepath: [defaultDir] });
    });

    it('metadata', async () => {
      const metadata = 'ApexClass,CustomObject';
      const result = await Source.run(['--rootdir', myApp, '--metadata', metadata, '--json']);
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({
        metadata: {
          metadataEntries: metadata.split(','),
          directoryPaths: [projectDir],
        },
      });
    });

    it('package', async () => {
      const result = await Source.run(['--rootdir', myApp, '--manifest', packageXml, '--json']);
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({
        manifest: {
          manifestPath: packageXml,
          directoryPaths: [projectDir],
        },
      });
    });
  });
});
