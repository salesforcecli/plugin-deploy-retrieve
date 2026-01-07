/*
 * Copyright 2026, Salesforce, Inc.
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
import * as fs from 'node:fs';
import { expect } from 'chai';
import { ComponentSet, RegistryAccess } from '@salesforce/source-deploy-retrieve';
import sinon from 'sinon';
import { writeManifest } from '../../src/utils/manifestCache.js';

describe('manifest cache', () => {
  let sandbox: sinon.SinonSandbox;
  let fsWriteStub: sinon.SinonStub;
  const registry = new RegistryAccess();

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fsWriteStub = sandbox.stub(fs.promises, 'writeFile');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('it will write an empty manifest', async () => {
    const cs = new ComponentSet();
    cs.apiVersion = '57.0';
    await writeManifest('123', cs, registry);
    expect(fsWriteStub.calledOnce).to.be.true;
    expect(fsWriteStub.firstCall.args[0]).to.include('123.xml');
    expect(fsWriteStub.firstCall.args[1]).to.equal(
      `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <version>57.0</version>
</Package>
`
    );
  });

  it('it will write a CustomLabels manifest', async () => {
    const cs = new ComponentSet();
    cs.apiVersion = '57.0';
    cs.add({ fullName: 'CustomLabels', type: 'CustomLabels' });
    await writeManifest('123', cs, registry);
    expect(fsWriteStub.calledOnce).to.be.true;
    expect(fsWriteStub.firstCall.args[0]).to.include('123.xml');
    expect(fsWriteStub.firstCall.args[1]).to.equal(
      `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>CustomLabels</members>
        <name>CustomLabels</name>
    </types>
    <version>57.0</version>
</Package>
`
    );
  });

  it('it will write a CustomLabel manifest', async () => {
    const cs = new ComponentSet();
    cs.apiVersion = '57.0';
    cs.add({ fullName: 'MyCustom', type: 'CustomLabel' });
    await writeManifest('123', cs, registry);
    expect(fsWriteStub.calledOnce).to.be.true;
    expect(fsWriteStub.firstCall.args[0]).to.include('123.xml');
    expect(fsWriteStub.firstCall.args[1]).to.equal(
      `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>MyCustom</members>
        <name>CustomLabel</name>
    </types>
    <version>57.0</version>
</Package>
`
    );
  });

  it('it will write a CustomLabel and strip CustomLabels manifest', async () => {
    const cs = new ComponentSet();
    cs.sourceApiVersion = '57.0';
    cs.add({ fullName: 'MyCustom', type: 'CustomLabel' });
    cs.add({ fullName: 'CustomLabels', type: 'CustomLabels' });
    await writeManifest('123', cs, registry);
    expect(fsWriteStub.calledOnce).to.be.true;
    expect(fsWriteStub.firstCall.args[0]).to.include('123.xml');
    expect(fsWriteStub.firstCall.args[1]).to.equal(
      `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>MyCustom</members>
        <name>CustomLabel</name>
    </types>
    <version>57.0</version>
</Package>
`
    );
  });

  it('it will write a CustomLabel and strip CustomLabels manifest with other MDTs', async () => {
    const cs = new ComponentSet();
    cs.sourceApiVersion = '57.0';
    cs.add({ fullName: 'MyCustom', type: 'CustomLabel' });
    cs.add({ fullName: 'CustomLabels', type: 'CustomLabels' });
    cs.add({ fullName: 'myClass', type: 'ApexClass' });
    await writeManifest('123', cs, registry);
    expect(fsWriteStub.calledOnce).to.be.true;
    expect(fsWriteStub.firstCall.args[0]).to.include('123.xml');
    expect(fsWriteStub.firstCall.args[1]).to.equal(
      `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>myClass</members>
        <name>ApexClass</name>
    </types>
    <types>
        <members>MyCustom</members>
        <name>CustomLabel</name>
    </types>
    <version>57.0</version>
</Package>
`
    );
  });
});
