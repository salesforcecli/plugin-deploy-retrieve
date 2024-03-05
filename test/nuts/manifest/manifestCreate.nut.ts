/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
    const result = execCmd<Dictionary>('force:source:manifest:create --metadata ApexClass --json', {
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
      `force:source:manifest:create --metadata ApexClass --manifesttype destroy --outputdir ${output} --apiversion=51.0 --json`,
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
      `force:source:manifest:create --metadata ApexClass --manifestname myNewManifest --outputdir ${output} --json`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: `${outputFile}`, name: 'myNewManifest.xml' });
  });

  it('should produce a manifest in a directory with stdout output', () => {
    const output = join('abc', 'def');
    const result = execCmd<Dictionary>(`force:source:manifest:create --metadata ApexClass --outputdir ${output}`, {
      ensureExitCode: 0,
    }).shellOutput;
    expect(result).to.include(`successfully wrote package.xml to ${output}`);
  });

  it('should produce a manifest with stdout output', () => {
    const result = execCmd<Dictionary>('force:source:manifest:create --metadata ApexClass', {
      ensureExitCode: 0,
    }).shellOutput;
    expect(result).to.include('successfully wrote package.xml');
  });

  it('should produce a manifest from metadata in an org', async () => {
    const manifestName = 'org-metadata.xml';
    const result = execCmd<Dictionary>(`force:source:manifest:create --fromorg ${orgAlias} -n ${manifestName} --json`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: manifestName, name: manifestName });
    const stats = fs.statSync(join(session.project.dir, manifestName));
    expect(stats.isFile()).to.be.true;
    expect(stats.size).to.be.greaterThan(100);
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
