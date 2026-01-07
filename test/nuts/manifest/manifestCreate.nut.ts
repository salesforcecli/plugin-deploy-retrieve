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
import { join } from 'node:path';

import { TestSession } from '@salesforce/cli-plugins-testkit';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { Dictionary } from '@salesforce/ts-types';
import { config, expect } from 'chai';

describe('project generate manifest', () => {
  let session: TestSession;
  const orgAlias = 'myAlias';

  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          config: join('config', 'project-scratch-def.json'),
          alias: orgAlias,
          setDefault: true,
          wait: 10,
          duration: 1,
        },
      ],
    });
  });

  after(async () => {
    await session?.clean();
  });

  it('should produce a manifest (package.xml) for ApexClass', () => {
    const result = execCmd<Dictionary>('project generate manifest --metadata ApexClass --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: 'package.xml', name: 'package.xml' });
  });

  it('should produce a manifest (destructiveChanges.xml) for ApexClass in a new directory', () => {
    const apexManifest =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n' +
      '    <types>\n' +
      '        <members>*</members>\n' +
      '        <members>FileUtilities</members>\n' +
      '        <members>FileUtilitiesTest</members>\n' +
      '        <members>GeocodingService</members>\n' +
      '        <members>GeocodingServiceTest</members>\n' +
      '        <members>PagedResult</members>\n' +
      '        <members>PropertyController</members>\n' +
      '        <members>SampleDataController</members>\n' +
      '        <members>TestPropertyController</members>\n' +
      '        <members>TestSampleDataController</members>\n' +
      '        <name>ApexClass</name>\n' +
      '    </types>\n' +
      '    <version>51.0</version>\n' +
      '</Package>';

    const output = join('abc', 'def');
    const outputFile = join(output, 'destructiveChanges.xml');
    const result = execCmd<Dictionary>(
      `project generate manifest --metadata ApexClass --manifesttype destroy --outputdir ${output} --apiversion=51.0 --json`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: `${outputFile}`, name: 'destructiveChanges.xml' });
    const file = fs.readFileSync(join(session.project.dir, outputFile), 'utf-8');
    expect(file).to.include(apexManifest);
  });

  it('should produce a custom manifest (myNewManifest.xml) for a sourcepath', () => {
    const output = join('abc', 'def');
    const outputFile = join(output, 'myNewManifest.xml');
    const result = execCmd<Dictionary>(
      `project generate manifest --metadata ApexClass --manifestname myNewManifest --outputdir ${output} --json`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: `${outputFile}`, name: 'myNewManifest.xml' });
  });

  it('should produce a manifest in a directory with stdout output', () => {
    const output = join('abc', 'def');
    const result = execCmd<Dictionary>(`project generate manifest --metadata ApexClass --outputdir ${output}`, {
      ensureExitCode: 0,
    }).shellOutput;
    expect(result).to.include(`successfully wrote package.xml to ${output}`);
  });

  it('should produce a manifest with stdout output', () => {
    const result = execCmd<Dictionary>('project generate manifest --metadata ApexClass', {
      ensureExitCode: 0,
    }).shellOutput;
    expect(result).to.include('successfully wrote package.xml');
  });

  describe('from org', () => {
    before(async () => {
      // Deploy all source in the project to the org so there's some metadata in it.
      execCmd<Dictionary>('project deploy start', { ensureExitCode: 0 });
    });

    it('should produce a manifest from metadata in an org', async () => {
      const manifestName = 'org-metadata.xml';
      const result = execCmd<Dictionary>(`project generate manifest --fromorg ${orgAlias} -n ${manifestName} --json`, {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(result).to.be.ok;
      expect(result).to.include({ path: manifestName, name: manifestName });
      const stats = fs.statSync(join(session.project.dir, manifestName));
      expect(stats.isFile()).to.be.true;
      expect(stats.size).to.be.greaterThan(100);
    });

    it('should produce a manifest from an include list of metadata in an org', async () => {
      const manifestName = 'org-metadata.xml';
      const includeList = 'ApexClass:FileUtil*,PermissionSet,Flow';
      execCmd<Dictionary>(
        `project generate manifest --fromorg ${orgAlias} -n ${manifestName} --metadata ${includeList} --json`,
        {
          ensureExitCode: 0,
        }
      );
      const manifestContents = fs.readFileSync(join(session.project.dir, manifestName), 'utf-8');

      const expectedManifestContents =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n' +
        '    <types>\n' +
        '        <members>FileUtilities</members>\n' +
        '        <members>FileUtilitiesTest</members>\n' +
        '        <name>ApexClass</name>\n' +
        '    </types>\n' +
        '    <types>\n' +
        '        <members>Create_property</members>\n' +
        '        <name>Flow</name>\n' +
        '    </types>\n' +
        '    <types>\n' +
        '        <members>dreamhouse</members>\n' +
        '        <members>sfdcInternalInt__sfdc_scrt2</members>\n' +
        '        <name>PermissionSet</name>\n' +
        '    </types>\n' +
        '    <version>64.0</version>\n' +
        '</Package>\n';
      expect(manifestContents).to.equal(expectedManifestContents);
    });

    it('should produce a manifest from an excluded list of metadata in an org', async () => {
      const manifestName = 'org-metadata.xml';
      const excludedList = 'ApexClass,CustomObject,StandardValueSet';
      execCmd<Dictionary>(
        `project generate manifest --fromorg ${orgAlias} -n ${manifestName} --excluded-metadata ${excludedList} --json`,
        {
          ensureExitCode: 0,
        }
      );
      const manifestContents = fs.readFileSync(join(session.project.dir, manifestName), 'utf-8');

      // should NOT have these entries
      expect(manifestContents).to.not.contain('<name>ApexClass</name>');
      expect(manifestContents).to.not.contain('<name>CustomObject</name>');
      expect(manifestContents).to.not.contain('<name>StandardValueSet</name>');

      // should have these entries
      expect(manifestContents).to.contain('<name>Layout</name>');
      expect(manifestContents).to.contain('<name>CustomLabels</name>');
      expect(manifestContents).to.contain('<name>Profile</name>');
    });

    it('should produce the same manifest from an org every time', async () => {
      config.truncateThreshold = 0;

      execCmd<Dictionary>(`project generate manifest --from-org ${orgAlias} -n org-metadata-1.xml`, {
        ensureExitCode: 0,
      });
      const manifest1 = fs.readFileSync(join(session.project.dir, 'org-metadata-1.xml'), 'utf-8');

      execCmd<Dictionary>(`project generate manifest --from-org ${orgAlias} -n org-metadata-2.xml`, {
        ensureExitCode: 0,
      });
      const manifest2 = fs.readFileSync(join(session.project.dir, 'org-metadata-2.xml'), 'utf-8');

      execCmd<Dictionary>(`project generate manifest --from-org ${orgAlias} -n org-metadata-3.xml`, {
        ensureExitCode: 0,
      });
      const manifest3 = fs.readFileSync(join(session.project.dir, 'org-metadata-3.xml'), 'utf-8');

      expect(manifest1).to.equal(manifest2);
      expect(manifest2).to.equal(manifest3);
    });
  });

  describe('filtering combinations', () => {
    let projectSubDir: string;
    before(async () => {
      // Add some other directories with apex classes
      projectSubDir = join(session.project.dir, 'force-app', 'core');
      const projectSubDirClasses = join(projectSubDir, 'classes');
      fs.mkdirSync(projectSubDirClasses, { recursive: true });
      fs.writeFileSync(join(projectSubDirClasses, 'ManifestCreateNut.cls'), 'empty cls');
      fs.writeFileSync(join(projectSubDirClasses, 'ManifestCreateNut.cls-meta.xml'), '<empty cls meta/>');
    });

    it('should produce a manifest from --source-dir and specific --metadata', () => {
      const combo1 = 'srcDirAndMetadata-package.xml';
      const forceAppMainDir = join(session.project.dir, 'force-app', 'main');
      const result = execCmd<Dictionary>(
        `project generate manifest --source-dir ${forceAppMainDir} --metadata ApexClass:FileUtilities --name ${combo1} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      expect(result).to.be.ok;
      expect(result).to.include({ path: combo1, name: combo1 });
      const manifestContents = fs.readFileSync(join(session.project.dir, combo1), 'utf-8');
      const expectedApexClasses = `<types>
        <members>FileUtilities</members>
        <name>ApexClass</name>
    </types>`;
      expect(manifestContents).to.include(expectedApexClasses);
      expect(manifestContents).to.not.include('<members>ManifestCreateNut</members>');
      expect(manifestContents).to.not.include('<members>PagedResult</members>');
    });

    it('should produce a manifest from --source-dir and wildcard --metadata', () => {
      const combo1 = 'srcDirAndMetadata-package.xml';
      const forceAppMainDir = join(session.project.dir, 'force-app', 'main');
      const result = execCmd<Dictionary>(
        `project generate manifest --source-dir ${forceAppMainDir} --metadata ApexClass --name ${combo1} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      expect(result).to.be.ok;
      expect(result).to.include({ path: combo1, name: combo1 });
      const manifestContents = fs.readFileSync(join(session.project.dir, combo1), 'utf-8');
      expect(manifestContents).to.not.include('<name>AuraDefinitionBundle</name>');
      expect(manifestContents).to.not.include('<members>ManifestCreateNut</members>');
      expect(manifestContents).to.include('<members>PagedResult</members>');
    });

    it('should produce a manifest from --source-dir and specific --excluded-metadata', () => {
      const combo3 = 'srcDirAndExcMetadata3-package.xml';
      const forceAppMainDir = join(session.project.dir, 'force-app', 'main');
      const result = execCmd<Dictionary>(
        `project generate manifest --source-dir ${forceAppMainDir} --excluded-metadata ApexClass:FileUtilities --name ${combo3} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      expect(result).to.be.ok;
      expect(result).to.include({ path: combo3, name: combo3 });
      const manifestContents = fs.readFileSync(join(session.project.dir, combo3), 'utf-8');
      expect(manifestContents).to.not.include('<members>ManifestCreateNut</members>');
      expect(manifestContents).to.not.include('<members>FileUtilities</members>');
      expect(manifestContents).to.include('<members>PagedResult</members>');
    });

    it('should produce a manifest from --source-dir and wildcard --excluded-metadata', () => {
      const combo4 = 'srcDirAndExcMetadata4-package.xml';
      const forceAppMainDir = join(session.project.dir, 'force-app', 'main');
      const result = execCmd<Dictionary>(
        `project generate manifest --source-dir ${forceAppMainDir} --excluded-metadata ApexClass --name ${combo4} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      expect(result).to.be.ok;
      expect(result).to.include({ path: combo4, name: combo4 });
      const manifestContents = fs.readFileSync(join(session.project.dir, combo4), 'utf-8');
      expect(manifestContents).to.not.include('<members>ManifestCreateNut</members>');
      expect(manifestContents).to.not.include('<members>FileUtilities</members>');
      expect(manifestContents).to.not.include('<name>ApexClass</name>');
      expect(manifestContents).to.include('<name>AuraDefinitionBundle</name>');
    });
  });
});
