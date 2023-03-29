/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// import * as fs from 'fs';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert } from 'chai';
import { DeleteSourceJson, DeployResultJson, RetrieveResultJson } from '../../../src/utils/types';

import {
  DEB_A_RELATIVE_PATH,
  DEBS_RELATIVE_PATH,
  DIR_RELATIVE_PATHS,
  FULL_NAMES,
  TEST_SESSION_OPTIONS,
  TYPES,
} from './constants';
import {
  assertAllDEBAndTheirDECounts,
  assertDocumentDetailPageA,
  assertDocumentDetailPageADelete,
  assertSingleDEBAndItsDECounts,
  assertViewHome,
  metadataToArray,
  createDocumentDetailPageAInLocal,
} from './helper';

describe('deb -- sourcepath option', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create(TEST_SESSION_OPTIONS);
  });

  after(async () => {
    await session?.clean();
  });

  describe('deploy', () => {
    before(() => {
      execCmd<DeployResultJson>(
        `project deploy start ${metadataToArray([TYPES.APEX_PAGE.name, TYPES.APEX_CLASS.name].join(','))} --json`,
        {
          ensureExitCode: 0,
        }
      );
    });

    it('should deploy complete enhanced lwr sites deb_a and deb_b (including de config, network and customsite)', () => {
      const deployedSource = execCmd<DeployResultJson>(
        `project deploy start --source-dir ${DEBS_RELATIVE_PATH} --source-dir ${DIR_RELATIVE_PATHS.DIGITAL_EXPERIENCE_CONFIGS} --source-dir ${DIR_RELATIVE_PATHS.NETWORKS} --source-dir ${DIR_RELATIVE_PATHS.SITES} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.files;
      assert(deployedSource);
      assertAllDEBAndTheirDECounts(deployedSource, 6);
    });

    describe('individual metadata type', () => {
      it('should deploy deb type (all debs - deb_a and deb_b)', () => {
        const deployedSource = execCmd<DeployResultJson>(
          `project deploy start --source-dir ${DEBS_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(deployedSource);

        assertAllDEBAndTheirDECounts(deployedSource);
      });
    });

    describe('individual metadata item', () => {
      it('should deploy just deb_a', () => {
        const deployedSource = execCmd<DeployResultJson>(
          `project deploy start --source-dir ${DEB_A_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(deployedSource);

        assertSingleDEBAndItsDECounts(deployedSource, FULL_NAMES.DEB_A);
      });

      it('should deploy de_view_home of deb_a', () => {
        const deployedSource = execCmd<DeployResultJson>(
          `project deploy start --source-dir ${DIR_RELATIVE_PATHS.DE_VIEW_HOME_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(deployedSource);

        assertViewHome(deployedSource, 'a');
      });
    });
  });

  describe('retrieve', () => {
    describe('individual metadata type', () => {
      it('should retrieve deb type (all debs - deb_a and deb_b)', async () => {
        const inboundFiles = execCmd<RetrieveResultJson>(
          `project retrieve start --source-dir ${DEBS_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(inboundFiles);
        assertAllDEBAndTheirDECounts(inboundFiles);
      });
    });

    describe('individual metadata item', () => {
      it('should retrieve just deb_a', async () => {
        const inboundFiles = execCmd<RetrieveResultJson>(
          `project retrieve start --source-dir ${DEB_A_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(inboundFiles);

        assertSingleDEBAndItsDECounts(inboundFiles, FULL_NAMES.DEB_A);
      });

      it('should retrieve de_view_home of deb_a', async () => {
        const inboundFiles = execCmd<RetrieveResultJson>(
          `project retrieve start --source-dir ${DIR_RELATIVE_PATHS.DE_VIEW_HOME_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(inboundFiles);

        assertViewHome(inboundFiles, 'a');
      });
    });
  });

  describe('new site page', () => {
    it('should deploy new page (view and route de components) of deb_a', async () => {
      createDocumentDetailPageAInLocal(session.project.dir);

      const deployedSource = execCmd<DeployResultJson>(
        `project deploy start --source-dir ${DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A} --source-dir ${DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.files;
      assert(deployedSource);

      assertDocumentDetailPageA(deployedSource);
    });

    it('should delete the page (view and route de components) of deb_a', async () => {
      const deletedSource = execCmd<DeleteSourceJson>(
        `project delete source --source-dir ${DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A} --source-dir ${DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A} --noprompt --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.deletedSource;
      assert(deletedSource);
      assertDocumentDetailPageA(deletedSource);
      await assertDocumentDetailPageADelete(session, true);
    });
  });
});
