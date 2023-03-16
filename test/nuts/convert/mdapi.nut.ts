/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { ComponentSet, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { ConvertMdapiJson } from '../../../src/utils/types';

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

describe('project convert mdapi NUTs', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      },
      devhubAuthStrategy: 'AUTO',
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('mdapi:convert', () => {
    let convertedToMdPath: string;

    before(() => {
      convertedToMdPath = path.join(session.dir, 'convertedToMdPath_dh');
      execCmd(`project:convert:source --json -d ${convertedToMdPath}`, { ensureExitCode: 0 });
    });

    it('should convert the dreamhouse project', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_all');
      const result = execCmd<ConvertMdapiJson>(
        `project:convert:mdapi -r ${convertedToMdPath} -d ${convertedToSrcPath} --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.be.an('array').with.length.greaterThan(10);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using metadata flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_metadataFlag');
      const result = execCmd<ConvertMdapiJson>(
        `project:convert:mdapi -r ${convertedToMdPath} -d ${convertedToSrcPath} -m ApexClass --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.be.an('array').with.length.greaterThan(10);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using metadatapath flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_metadatapathFlag');
      const metadataPath = path.join(convertedToMdPath, 'classes', 'PagedResult.cls');
      const result = execCmd<ConvertMdapiJson>(
        `project:convert:mdapi -r ${convertedToMdPath} -d ${convertedToSrcPath} -p ${metadataPath} --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.be.an('array').with.lengthOf(2);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using manifest flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_manifestFlag');
      const manifestPath = path.join(session.dir, 'manifestFlag-package.xml');
      writeManifest(manifestPath);
      const result = execCmd<ConvertMdapiJson>(
        `project:convert:mdapi -r ${convertedToMdPath} -d ${convertedToSrcPath} -x ${manifestPath} --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(result.jsonOutput?.result).to.be.an('array').with.length.greaterThan(10);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project and back again', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_mdapi');
      const convertedToMd2 = path.join(session.dir, 'convertedToMdPath_dh_backAgain');
      const result = execCmd<ConvertMdapiJson>(
        `project:convert:mdapi -r ${convertedToMdPath} -d ${convertedToSrcPath} --json`
      );
      expect(result.jsonOutput?.status).to.equal(0);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;

      // Now source:convert back and compare dirs
      execCmd(`project:convert:source --json -r ${convertedToSrcPath} -d ${convertedToMd2}`, { ensureExitCode: 0 });

      const mdCompSet1 = ComponentSet.fromSource(convertedToMdPath);
      const mdCompSet2 = ComponentSet.fromSource(convertedToMd2);
      expect(mdCompSet1.size).to.equal(mdCompSet2.size).and.be.greaterThan(10);
      for (const comp of mdCompSet1) {
        const srcComp2 = mdCompSet2.find(
          (c) => c.fullName === comp.fullName && c.type.name === comp.type.name
        ) as SourceComponent;
        expect(srcComp2).to.be.ok;
        const srcComp = comp as SourceComponent;
        if (srcComp.xml && srcComp2.xml) {
          const size1 = fs.statSync(srcComp.xml).size;
          const size2 = fs.statSync(srcComp2.xml).size;
          expect(size1).to.equal(size2);
        }
        if (srcComp.content && srcComp2.content) {
          const stat1 = fs.statSync(srcComp.content);
          const stat2 = fs.statSync(srcComp2.content);

          if (stat1.isFile()) {
            const size1 = stat1.size;
            const size2 = stat2.size;
            // Content files can differ slightly due to compression so compare
            // with a tolerance.
            expect(size1 / size2, `file1 size: ${size1} should ~ equal file2 size: ${size2}`).to.be.within(0.98, 1.02);
          }
        }
      }
    });
  });
});
