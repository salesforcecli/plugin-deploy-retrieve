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
// import * as fs from 'fs';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert } from 'chai';
import { DeleteSourceJson, DeployResultJson, RetrieveResultJson } from '../../../src/utils/types.js';

import {
  DEB_A_RELATIVE_PATH,
  DEBS_RELATIVE_PATH,
  DIR_RELATIVE_PATHS,
  FULL_NAMES,
  TEST_SESSION_OPTIONS,
  TYPES,
} from './constants.js';
import {
  assertAllDEBAndTheirDECounts,
  assertDocumentDetailPageA,
  assertDocumentDetailPageADelete,
  assertSingleDEBAndItsDECounts,
  assertViewHome,
  metadataToArray,
  createDocumentDetailPageAInLocal,
} from './helper.js';

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
