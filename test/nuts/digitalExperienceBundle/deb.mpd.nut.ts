/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert, expect, config } from 'chai';
import { DeployResultJson } from '../../../src/utils/types.js';

config.truncateThreshold = 0;

import { DEB_NUTS_PATH } from './constants.js';
import { assertAllDEBAndTheirDECounts } from './helper.js';

describe('deb --metadata option', () => {
  let session: TestSession;

  let debAPath: string;
  let debBPath: string;

  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: join(DEB_NUTS_PATH, 'mpdProject'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          setDefault: true,
          config: join('config', 'project-scratch-def.json'),
        },
      ],
    });
    debAPath = join(
      session.project.dir,
      'force-app',
      'main',
      'default',
      'digitalExperiences',
      'site',
      'Capricorn_Coffee_A1'
    );

    debBPath = join(
      session.project.dir,
      'my-app',
      'main',
      'default',
      'digitalExperiences',
      'site',
      'Capricorn_Coffee_B1'
    );
  });

  after(async () => {
    await session?.clean();
  });

  describe('MPD retrieve', () => {
    before(() => {
      execCmd<DeployResultJson>('project deploy start --json', {
        ensureExitCode: 0,
      });
    });

    it('should retrieve and write all debs to their package dir', () => {
      const deployedSource = execCmd<DeployResultJson>(
        'project retrieve start --metadata DigitalExperienceBundle --json',
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.files;
      assert(deployedSource);
      assertAllDEBAndTheirDECounts(deployedSource);

      // assert all DE files were properly retrieved and merged into multiple package dirs.
      for (const deFile of deployedSource.filter((f) => f.type === 'DigitalExperience')) {
        if (deFile.fullName.includes('Capricorn_Coffee_A1')) {
          expect(deFile.filePath).to.include(debAPath);
          expect(deFile.filePath).to.not.include(debBPath);
        } else if (deFile.fullName.includes('Capricorn_Coffee_B1')) {
          expect(deFile.filePath).to.include(debBPath);
          expect(deFile.filePath).to.not.include(debAPath);
        } else {
          assert.fail(`File: ${deFile.filePath} was written outside expected package directories.`);
        }
      }
    });

    it('should retrieve individual deb in default pkg dir', () => {
      const deployedSource = execCmd<DeployResultJson>(
        'project retrieve start --metadata DigitalExperience:site/Capricorn_Coffee_A1.sfdc_cms__view/home --json',
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.files;
      assert(deployedSource);

      for (const deFile of deployedSource) {
        expect(deFile.filePath).to.include(debAPath);
      }
    });

    it('should retrieve individual deb in non-default pkg dir', () => {
      const deployedSource = execCmd<DeployResultJson>(
        'project retrieve start --metadata DigitalExperience:site/Capricorn_Coffee_B1.sfdc_cms__view/home --json',
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.files;
      assert(deployedSource);

      for (const deFile of deployedSource) {
        expect(deFile.filePath).to.include(debBPath);
      }
    });
  });
});
