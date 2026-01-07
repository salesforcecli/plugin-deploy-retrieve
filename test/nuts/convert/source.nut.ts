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
import * as path from 'node:path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { ConvertResultJson } from '../../../src/utils/types.js';

let session: TestSession;

const writeManifest = (manifestPath: string, contents?: string) => {
  const defaultContents = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>*</members>
        <name>ApexClass</name>
    </types>
    <version>53.0</version>
</Package>`;
  fs.writeFileSync(manifestPath, contents ?? defaultContents);
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
        execCmd('project:convert:source --output-dir package.json', { ensureExitCode: 'nonZero' });
      });
      it('should error when metadatapath does not exist', () => {
        execCmd('project:convert:source --metadata-dir not/a/real/path -d mdapiOut', { ensureExitCode: 'nonZero' });
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
