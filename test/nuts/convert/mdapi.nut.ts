/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, assert } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { ComponentSet, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { ConvertMdapiJson } from '../../../src/utils/types.js';

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

describe('project convert mdapi NUTs', () => {
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

  describe('mdapi:convert', () => {
    let convertedToMdPath: string;

    before(() => {
      convertedToMdPath = path.join(session.dir, 'convertedToMdPath_dh');
      execCmd(`project:convert:source --json -d ${convertedToMdPath}`, { ensureExitCode: 0 });
    });
    describe('failures', () => {
      it('should error when outputdir is not a directory', () => {
        execCmd('project:convert:mdapi --output-dir package.json', { ensureExitCode: 'nonZero' });
      });
      it('should error when metadatapath does not exist', () => {
        execCmd('project:convert:mdapi --metadata-dir not/a/real/path -d mdapiOut', { ensureExitCode: 'nonZero' });
      });
      it('should throw when no metadata to convert converted (json)', async () => {
        const emptyManifest = 'emptyManifest.xml';
        await fs.promises.writeFile(
          path.join(session.project.dir, emptyManifest),
          '<?xml version="1.0" encoding="UTF-8"?> <Package xmlns="http://soap.sforce.com/2006/04/metadata"><version>57.0</version></Package>'
        );
        // write an empty manifest
        const results = execCmd(
          `project:convert:mdapi -r ${convertedToMdPath} --output-dir output --manifest ${emptyManifest} --json`,
          {
            ensureExitCode: 1,
          }
        ).jsonOutput;
        assert(results);
        expect(results.message).to.deep.include('No results');
      });
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
      expect(result.jsonOutput).to.not.be.undefined;
      result.jsonOutput?.result.forEach((md) => {
        expect(md.filePath.startsWith(convertedToSrcPath)).to.be.true;
      });
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
