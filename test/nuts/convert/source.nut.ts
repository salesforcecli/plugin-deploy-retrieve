/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { ConvertResultJson } from '../../../src/utils/types';

let session: TestSession;

const writeManifest = (manifestPath: string, contents?: string) => {
  contents ??= `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>*</members>
        <name>ApexClass</name>
    </types>
    <version>53.0</version>
</Package>`;
  fs.writeFileSync(manifestPath, contents);
};

describe('project convert source NUTs', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      },
      devhubAuthStrategy: 'NONE',
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('source:convert', () => {
    describe('failures', () => {
      it('should error when outputdir is not a directory', () => {
        execCmd('project:convert:source --output-dir package.json', { ensureExitCode: 1 });
      });
      it('should error when metadatapath does not exist', () => {
        execCmd('project:convert:source --metadata-dir not/a/real/path -d mdapiOut', { ensureExitCode: 1 });
      });
    });

    it('should convert the dreamhouse project', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_all');
      const result = execCmd<ConvertResultJson>(`project:convert:source -r force-app -d ${convertedToSrcPath} --json`);
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.have.key('location');
      expect(result.jsonOutput?.result.location).to.include(convertedToSrcPath);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using metadata flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_metadataFlag');
      const result = execCmd<ConvertResultJson>(
        `project:convert:source -r force-app -d ${convertedToSrcPath} -m ApexClass --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.have.key('location');
      expect(result.jsonOutput?.result.location).to.include(convertedToSrcPath);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using manifest flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_manifestFlag');
      const manifestPath = path.join(session.dir, 'manifestFlag-package.xml');
      writeManifest(manifestPath);
      const result = execCmd<ConvertResultJson>(
        `project:convert:source -r force-app -d ${convertedToSrcPath} -x ${manifestPath} --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.have.key('location');
      expect(result.jsonOutput?.result.location).to.include(convertedToSrcPath);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using --package-name flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_manifestFlag');
      const manifestPath = path.join(session.dir, 'manifestFlag-package.xml');
      writeManifest(manifestPath);
      const result = execCmd<ConvertResultJson>(
        `project:convert:source -r force-app -d ${convertedToSrcPath} -x ${manifestPath} --package-name "my sweet package" --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.have.key('location');
      expect(result.jsonOutput?.result.location).to.include(convertedToSrcPath);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
      expect(fs.readFileSync(path.join(convertedToSrcPath, 'package.xml'), 'utf8')).to.include('my sweet package');
    });

    it('should convert the dreamhouse project using --package-name flag and multiple output-dir', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_manifestFlag');
      const manifestPath = path.join(session.dir, 'manifestFlag-package.xml');
      writeManifest(manifestPath);
      const result = execCmd<ConvertResultJson>(
        `project:convert:source -r force-app -d ${path.join(
          convertedToSrcPath,
          'my',
          'directory'
        )} -x ${manifestPath} --package-name "my sweet package" --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.have.key('location');
      expect(result.jsonOutput?.result.location).to.include(path.join(convertedToSrcPath, 'my', 'directory'));
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
      expect(fs.readFileSync(path.join(convertedToSrcPath, 'package.xml'), 'utf8')).to.include('my sweet package');
    });
  });
});
