/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { join } from 'node:path'
import { assert } from 'chai';
import { DeployResultJson } from '../../../src/utils/types.js';

import { DEB_NUTS_PATH, FULL_NAMES } from './constants.js';
import {
  assertAllDEBAndTheirDECounts,
} from './helper.js';

describe('deb -- metadata option', () => {
  let session: TestSession;

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
  });

  after(async () => {
    await session?.clean();
  });

  describe('retrieve', () => {
    before(() => {
      execCmd<DeployResultJson>(
        `project deploy start --json`,
        {
          ensureExitCode: 0,
        }
      );
    });

    it('should retrieve and write all debs to their package dir', () => {
      const deployedSource = execCmd<DeployResultJson>(
        `project deploy start --metadata DigitalExperienceBundle --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.files;
      assert(deployedSource);
      assertAllDEBAndTheirDECounts(deployedSource);
      for (const file of deployedSource) {
        // TODO: make this match the fullPath instead of substring
        if (file.fullName === FULL_NAMES.DEB_A) {
          assert(file.filePath?.includes('force-app'))
        } else if (file.fullName === FULL_NAMES.DEB_B) {
          assert(file.filePath?.includes('my-app'))
        }
      }
    });
    })})
