/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { DeployMessage } from '@salesforce/source-deploy-retrieve';
import { DeployResultJson } from '../../../src/utils/types.js';

const isNameObsolete = async (username: string, memberType: string, memberName: string): Promise<boolean> => {
  const connection = await Connection.create({
    authInfo: await AuthInfo.create({ username }),
  });

  const res = await connection.singleRecordQuery<{ IsNameObsolete: boolean }>(
    `SELECT IsNameObsolete FROM SourceMember WHERE MemberType='${memberType}' AND MemberName='${memberName}'`,
    { tooling: true }
  );

  return res.IsNameObsolete;
};

describe('project deploy start --destructive NUTs', () => {
  let testkit: SourceTestkit;

  const createApexClass = (apexName = 'myApexClass') => {
    // create and deploy an ApexClass that can be deleted without dependency issues
    const output = path.join('force-app', 'main', 'default', 'classes');
    const pathToClass = path.join(testkit.projectDir, output, `${apexName}.cls`);
    execCmd(`force:apex:class:create --classname ${apexName} --outputdir ${output} --api-version 58.0`, {
      ensureExitCode: 0,
      cli: 'sf',
    });
    execCmd(`project:deploy:start -m ApexClass:${apexName}`, { ensureExitCode: 0 });
    return { apexName, output, pathToClass };
  };

  const createManifest = (metadata: string, manifesttype: string) => {
    execCmd(`force:source:manifest:create --metadata ${metadata} --manifesttype ${manifesttype}`, {
      ensureExitCode: 0,
    });
  };

  before(async () => {
    testkit = await SourceTestkit.create({
      nut: fileURLToPath(import.meta.url),
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    });
    execCmd('project:deploy:start --source-dir force-app', { ensureExitCode: 0 });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('destructive changes POST', () => {
    it('should deploy and then delete an ApexClass ', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'post');

      execCmd(
        'project:deploy:start --json --manifest package.xml --post-destructive-changes destructiveChangesPost.xml',
        {
          ensureExitCode: 0,
        }
      );

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;
    });
  });

  describe('destructive changes PRE', () => {
    it('should delete an ApexClass and then deploy a class', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      execCmd(
        'project:deploy:start --json --manifest package.xml --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;
    });

    it('should delete and deploy the same component', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest(`ApexClass:${apexName}`, 'pre');

      const result = execCmd<DeployResultJson>(
        'project:deploy:start --json --manifest destructiveChangesPre.xml --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.false;

      const successes = result?.jsonOutput?.result.details?.componentSuccesses as DeployMessage[];
      assert(successes);
      // 1 package, 2 of the same apex classes
      expect(successes.length).to.equal(3);
      expect(successes.filter((c) => c.fullName === 'a').some((c) => c.deleted === true)).to.be.true;
      expect(successes.filter((c) => c.fullName === 'a').some((c) => c.deleted === false)).to.be.true;
    });

    it('should delete and get file information with an empty deploy package', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest(`ApexClass:${apexName}`, 'pre');

      writeFileSync(
        path.join(testkit.projectDir, 'package.xml'),
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n' +
          '    <version>59.0</version>\n' +
          '</Package>'
      );

      const result = execCmd<DeployResultJson>(
        'project:deploy:start --json --manifest package.xml --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;

      const files = result?.jsonOutput?.result.files;
      assert(files);
      // 1 .cls, 1 .cls-meta.xml
      expect(files.length).to.equal(2);
      expect(files.filter((c) => c.fullName === 'a').every((c) => c.filePath !== undefined)).to.be.true;
    });

    it('should delete an ApexClass and then deploy a class with --purge-on-delete', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      execCmd(
        'project:deploy:start --json --manifest package.xml --purge-on-delete --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;
    });
  });

  describe('destructive changes POST and PRE', () => {
    it('should delete a class, then deploy and then delete an ApexClass', async () => {
      const pre = createApexClass('pre').apexName;
      const post = createApexClass('post').apexName;
      let preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      let postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);

      expect(preDeleted).to.be.false;
      expect(postDeleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${post}`, 'post');
      createManifest(`ApexClass:${pre}`, 'pre');

      execCmd(
        'project:deploy:start --json --manifest package.xml --post-destructive-changes destructiveChangesPost.xml --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);
      expect(preDeleted).to.be.true;
      expect(postDeleted).to.be.true;
    });

    it('should delete a class, then deploy and then delete an ApexClass with --purge-on-delete', async () => {
      const pre = createApexClass('pre').apexName;
      const post = createApexClass('post').apexName;
      let preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      let postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);

      expect(preDeleted).to.be.false;
      expect(postDeleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${post}`, 'post');
      createManifest(`ApexClass:${pre}`, 'pre');

      execCmd(
        'project:deploy:start --json --manifest package.xml --purge-on-delete --post-destructive-changes destructiveChangesPost.xml --pre-destructive-changes destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);
      expect(preDeleted).to.be.true;
      expect(postDeleted).to.be.true;
    });
  });

  describe('errors', () => {
    it('should throw an error when a pre destructive flag is passed without the manifest flag', async () => {
      const { apexName } = createApexClass();

      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      try {
        execCmd(
          'project:deploy:start --json --source-dir force-app --pre-destructive-changes destructiveChangesPre.xml'
        );
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include(
          'Error: --manifest= must also be provided when using --pre-destructive-changes='
        );
      }
    });

    it('should throw an error when a post destructive flag is passed without the manifest flag', async () => {
      const { apexName } = createApexClass();

      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      try {
        execCmd(
          'project:deploy:start --json --source-dir force-app --post-destructive-changes destructiveChangesPre.xml'
        );
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include(
          'Error: --manifest= must also be provided when using --post-destructive-changes='
        );
      }
    });

    it("should throw an error when a destructive manifest is passed that doesn't exist", () => {
      createManifest('ApexClass:GeocodingService', 'package');

      try {
        execCmd('project:deploy:start --json --manifest package.xml --pre-destructive-changes doesntexist.xml');
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include("ENOENT: no such file or directory, open 'doesntexist.xml'");
      }
    });
  });
});
