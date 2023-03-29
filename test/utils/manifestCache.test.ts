/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { expect } from 'chai';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import * as sinon from 'sinon';
import { writeManifest } from '../../src/utils/manifestCache';

describe('manifest cache', () => {
  let sandbox: sinon.SinonSandbox;
  let fsWriteStub: sinon.SinonStub;

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
    await writeManifest('123', cs);
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
    await writeManifest('123', cs);
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
    await writeManifest('123', cs);
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
    cs.apiVersion = '57.0';
    cs.add({ fullName: 'MyCustom', type: 'CustomLabel' });
    cs.add({ fullName: 'CustomLabels', type: 'CustomLabels' });
    await writeManifest('123', cs);
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
    cs.apiVersion = '57.0';
    cs.add({ fullName: 'MyCustom', type: 'CustomLabel' });
    cs.add({ fullName: 'CustomLabels', type: 'CustomLabels' });
    cs.add({ fullName: 'myClass', type: 'ApexClass' });
    await writeManifest('123', cs);
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
