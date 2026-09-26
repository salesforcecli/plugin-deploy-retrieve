/*
 * Copyright 2025, Salesforce, Inc.
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
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert, expect } from 'chai';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types.js';
import { METADATA, TEST_SESSION_OPTIONS, WEBAPPS_RELATIVE_PATH } from './constants.js';
import { assertWebAppFilesExist, deleteLocalSource, metadataToArray } from './helper.js';

describe('web_app DigitalExperienceBundle', () => {
  let session: TestSession;

  before(async function () {
    this.timeout(600000); // 10 minutes for scratch org creation
    session = await TestSession.create(TEST_SESSION_OPTIONS);
  });

  after(async function () {
    this.timeout(60000); // 1 minute for cleanup
    await session?.clean();
  });

  describe('deploy', () => {
    it('should deploy webapp bundle without "not found in local project" warnings', function () {
      this.timeout(120000); // 2 minutes for deploy
      const result = execCmd<DeployResultJson>(`project deploy start ${metadataToArray(METADATA.WEBAPP)} --json`, {
        ensureExitCode: 0,
      });

      const deployResult = result.jsonOutput?.result;
      const warnings = result.jsonOutput?.warnings ?? [];

      assert(deployResult, 'Deploy result should exist');
      expect(deployResult.status).to.equal('Succeeded', 'Deployment should succeed');

      // Verify no "not found in local project" warnings
      const notFoundWarnings = warnings.filter((w: string) =>
        w.includes('returned from org, but not found in the local project')
      );
      expect(
        notFoundWarnings,
        `Should have no "not found in local project" warnings. Found: ${notFoundWarnings.join(', ')}`
      ).to.have.lengthOf(0);

      // Get deployed DigitalExperience files (path-based fullNames like web_app/WebApp/src/App.js)
      const deFiles = deployResult.files.filter(
        (file) => file.type === 'DigitalExperience' && file.fullName.startsWith('web_app/')
      );

      expect(deFiles.length).to.be.greaterThan(0, 'Should have deployed DigitalExperience files');

      // All files should have valid file paths (means they matched local files)
      deFiles.forEach((file) => {
        expect(file.filePath, `File ${file.fullName} should have a filePath`).to.exist;
        expect(file.state).to.match(/Changed|Created/);
      });
    });

    it('should use path-based fullNames for web_app files', function () {
      this.timeout(120000); // 2 minutes for deploy
      const deployResult = execCmd<DeployResultJson>(
        `project deploy start ${metadataToArray(METADATA.WEBAPP)} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;

      assert(deployResult?.files, 'Deploy result should contain files');

      const deFiles = deployResult.files.filter(
        (file) => file.type === 'DigitalExperience' && file.fullName.startsWith('web_app/')
      );

      // All files should follow path-based pattern: web_app/WebApp/path/to/file
      const fullNamePattern = /^web_app\/\w+\/.+$/;
      deFiles.forEach((file) => {
        expect(file.fullName).to.match(fullNamePattern, `Invalid fullName format: ${file.fullName}`);
      });

      // Verify specific files have path-based fullNames
      const expectedFullNames = [
        'web_app/WebApp/webapp.json',
        'web_app/WebApp/src/App.js',
        'web_app/WebApp/src/App.css',
        'web_app/WebApp/public/index.html',
      ];

      expectedFullNames.forEach((expectedFullName) => {
        const matchingFile = deFiles.find((file) => file.fullName === expectedFullName);
        expect(matchingFile, `Should find file with fullName: ${expectedFullName}`).to.exist;
      });
    });
  });

  describe('retrieve', () => {
    beforeEach(async function () {
      this.timeout(30000); // 30 seconds for file deletion
      await deleteLocalSource(WEBAPPS_RELATIVE_PATH, session.project.dir);
    });

    it('should retrieve webapp bundle with path-based fullNames', async function () {
      this.timeout(120000); // 2 minutes for retrieve
      const result = execCmd<RetrieveResultJson>(`project retrieve start ${metadataToArray(METADATA.WEBAPP)} --json`, {
        ensureExitCode: 0,
      });

      const retrieveResult = result.jsonOutput?.result;
      assert(retrieveResult?.files, 'Retrieve result should contain files');

      // Verify files were retrieved
      expect(retrieveResult.files.length).to.be.greaterThan(0, 'Should have retrieved files');

      // Verify local files exist
      assertWebAppFilesExist(session.project.dir);

      // Verify DigitalExperience files have path-based fullNames
      const deFiles = retrieveResult.files.filter(
        (file) => file.type === 'DigitalExperience' && file.fullName.startsWith('web_app/')
      );

      if (deFiles.length > 0) {
        // All files should follow path-based pattern: web_app/WebApp/path/to/file
        const fullNamePattern = /^web_app\/\w+\/.+$/;
        deFiles.forEach((file) => {
          expect(file.fullName).to.match(fullNamePattern, `Invalid fullName format: ${file.fullName}`);
        });
      }
    });
  });

  describe('forceignore', () => {
    let originalForceignore: string;
    const forceignorePath = (): string => join(session.project.dir, '.forceignore');

    beforeEach(() => {
      // Save original .forceignore content
      originalForceignore = fs.existsSync(forceignorePath()) ? fs.readFileSync(forceignorePath(), 'utf8') : '';
    });

    afterEach(() => {
      // Restore original .forceignore
      fs.writeFileSync(forceignorePath(), originalForceignore);
    });

    it('should not deploy files that match .forceignore patterns', function () {
      this.timeout(120000); // 2 minutes for deploy
      // Add App.css to forceignore
      const ignorePattern = '**/web_app/**/App.css';
      fs.appendFileSync(forceignorePath(), `\n${ignorePattern}\n`);

      const deployResult = execCmd<DeployResultJson>(
        `project deploy start ${metadataToArray(METADATA.WEBAPP)} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;

      assert(deployResult?.files, 'Deploy result should contain files');

      // App.css should NOT be in deployed files
      const appCssFile = deployResult.files.find((f) => f.filePath?.endsWith('App.css'));
      expect(appCssFile, 'App.css should not be deployed when in .forceignore').to.be.undefined;

      // Other files should still be deployed
      const otherFiles = deployResult.files.filter(
        (f) => f.type === 'DigitalExperience' && f.fullName.startsWith('web_app/') && !f.filePath?.endsWith('App.css')
      );
      expect(otherFiles.length).to.be.greaterThan(0, 'Other files should still be deployed');
    });

    it('should not retrieve files that match .forceignore patterns', async function () {
      this.timeout(180000); // 3 minutes for deploy + retrieve
      // First deploy everything
      execCmd<DeployResultJson>(`project deploy start ${metadataToArray(METADATA.WEBAPP)} --json`, {
        ensureExitCode: 0,
      });

      // Add App.js to forceignore before retrieve
      const ignorePattern = '**/web_app/**/App.js';
      fs.appendFileSync(forceignorePath(), `\n${ignorePattern}\n`);

      // Delete local source to force fresh retrieve
      await deleteLocalSource(WEBAPPS_RELATIVE_PATH, session.project.dir);

      // Retrieve
      const retrieveResult = execCmd<RetrieveResultJson>(
        `project retrieve start ${metadataToArray(METADATA.WEBAPP)} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;

      assert(retrieveResult?.files, 'Retrieve result should contain files');

      // App.js should NOT be in retrieved files
      const appJsFile = retrieveResult.files.find((f) => f.filePath?.endsWith('App.js'));
      expect(appJsFile, 'App.js should not be retrieved when in .forceignore').to.be.undefined;

      // Other files should still be retrieved
      const otherFiles = retrieveResult.files.filter((f) => f.type === 'DigitalExperience');
      expect(otherFiles.length).to.be.greaterThan(0, 'Other files should still be retrieved');
    });
  });
});
