/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import { Parser } from '@oclif/core';
import * as sinon from 'sinon';
import { testLevelFlag, fileOrDirFlag, ensuredDirFlag, zipFileFlag } from '../../src/utils/flags';
import { TestLevel } from '../../src/utils/types';

const STAT = {
  isDirectory: () => false,
  isFile(): boolean {
    throw new Error('Function not implemented.');
  },
  isBlockDevice(): boolean {
    throw new Error('Function not implemented.');
  },
  isCharacterDevice(): boolean {
    throw new Error('Function not implemented.');
  },
  isSymbolicLink(): boolean {
    throw new Error('Function not implemented.');
  },
  isFIFO(): boolean {
    throw new Error('Function not implemented.');
  },
  isSocket(): boolean {
    throw new Error('Function not implemented.');
  },
  dev: 0,
  ino: 0,
  mode: 0,
  nlink: 0,
  uid: 0,
  gid: 0,
  rdev: 0,
  size: 0,
  blksize: 0,
  blocks: 0,
  atimeMs: 0,
  mtimeMs: 0,
  ctimeMs: 0,
  birthtimeMs: 0,
  atime: undefined,
  mtime: undefined,
  ctime: undefined,
  birthtime: undefined,
};

describe('testLevelFlag', () => {
  it('returns a test level', async () => {
    const out = await Parser.parse([`--testLevel=${TestLevel.RunAllTestsInOrg}`], {
      flags: { testLevel: testLevelFlag() },
    });
    expect(out.flags).to.deep.include({ testLevel: TestLevel.RunAllTestsInOrg });
  });

  it('fails when provided an invalid test level', async () => {
    try {
      await Parser.parse(['--testLevel=FooBar'], {
        flags: { testLevel: testLevelFlag() },
      });
      assert.fail('This should have failed');
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(err.message).to.include('Expected --testLevel=FooBar to be one of');
    }
  });
});

describe('fileOrDirFlag', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns a file', async () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs.promises, 'stat').resolves(STAT);

    const out = await Parser.parse(['--fileOrDir=foo.json'], {
      flags: { fileOrDir: fileOrDirFlag() },
    });
    expect(out.flags).to.deep.equal({ fileOrDir: { type: 'file', path: 'foo.json' } });
  });

  it('returns a directory', async () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs.promises, 'stat').resolves({ ...STAT, isDirectory: () => true });

    const out = await Parser.parse(['--fileOrDir=foo'], {
      flags: { fileOrDir: fileOrDirFlag() },
    });
    expect(out.flags).to.deep.equal({ fileOrDir: { type: 'directory', path: 'foo' } });
  });

  it('throws if file does not exist and it is required to exist', async () => {
    sandbox.stub(fs, 'existsSync').returns(false);
    try {
      await Parser.parse(['--fileOrDir=foo.json'], {
        flags: { fileOrDir: fileOrDirFlag({ exists: true }) },
      });
      assert.fail('This should have failed');
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(err.name).to.equal('InvalidFlagPathError');
    }
  });
});

describe('ensuredDirFlag', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns a directory that already exists', async () => {
    sandbox.stub(fs.promises, 'stat').resolves({ ...STAT, isDirectory: () => true });

    const spy = sandbox.stub(fs.promises, 'mkdir').resolves();

    const out = await Parser.parse(['--dir=foo'], {
      flags: { dir: ensuredDirFlag() },
    });
    expect(out.flags).to.deep.equal({ dir: path.resolve('foo') });
    expect(spy.callCount).to.equal(0);
  });

  it('returns a created directory', async () => {
    sandbox.stub(fs.promises, 'stat').throws({ code: 'ENOENT' });

    const spy = sandbox.stub(fs.promises, 'mkdir').resolves();

    const out = await Parser.parse(['--dir=foo'], {
      flags: { dir: ensuredDirFlag() },
    });
    expect(out.flags).to.deep.equal({ dir: path.resolve('foo') });
    expect(spy.callCount).to.equal(1);
  });

  it('throws if the provided string is a file', async () => {
    sandbox.stub(fs.promises, 'stat').resolves(STAT);
    try {
      await Parser.parse(['--dir=foo.json'], {
        flags: { dir: ensuredDirFlag() },
      });
      assert.fail('This should have failed');
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(err.name).to.equal('InvalidFlagPathError');
    }
  });
});

describe('zipFileFlag', () => {
  it('should return a file that is appended with .zip', async () => {
    const out = await Parser.parse(['--zipFile=foo'], {
      flags: { zipFile: zipFileFlag() },
    });
    expect(out.flags).to.deep.equal({ zipFile: 'foo.zip' });
  });

  it('should return a file that is already appended with .zip', async () => {
    const out = await Parser.parse(['--zipFile=foo.zip'], {
      flags: { zipFile: zipFileFlag() },
    });
    expect(out.flags).to.deep.equal({ zipFile: 'foo.zip' });
  });

  it('should return unpackaged.zip when nothing is provided', async () => {
    const out = await Parser.parse(['--zipFile='], {
      flags: { zipFile: zipFileFlag() },
    });
    expect(out.flags).to.deep.equal({ zipFile: 'unpackaged.zip' });
  });
});
