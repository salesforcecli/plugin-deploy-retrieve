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
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert } from 'chai';
import { beforeEach } from 'mocha';
import { DeleteSourceJson, DeployResultJson, RetrieveResultJson } from '../../../src/utils/types.js';

import { DEBS_RELATIVE_PATH, FULL_NAMES, METADATA, TEST_SESSION_OPTIONS, TYPES } from './constants.js';
import {
  assertAllDEBAndTheirDECounts,
  assertDECountOfSingleDEB,
  assertDECountsOfAllDEB,
  assertDocumentDetailPageA,
  assertDocumentDetailPageADelete,
  assertSingleDEBAndItsDECounts,
  assertViewHome,
  createDocumentDetailPageAInLocal,
  deleteLocalSource,
  metadataToArray,
} from './helper.js';

describe('deb -- metadata option', () => {
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
        `project deploy start ${metadataToArray(METADATA.FULL_SITE_DEB_A_AND_B)} --json`,
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
          `project deploy start ${metadataToArray(METADATA.ALL_DEBS)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(deployedSource);

        assertAllDEBAndTheirDECounts(deployedSource);
      });

      it('should deploy de type (all de components of deb_a and deb_b)', () => {
        const deployedSource = execCmd<DeployResultJson>(
          `project deploy start ${metadataToArray(METADATA.ALL_DE)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(deployedSource);

        assertDECountsOfAllDEB(deployedSource);
      });
    });

    describe('individual metadata item', () => {
      it('should deploy all de components of deb_b', () => {
        const deployedSource = execCmd<DeployResultJson>(
          `project deploy start ${metadataToArray(METADATA.ALL_DE_OF_DEB_B)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(deployedSource);

        assertDECountOfSingleDEB(deployedSource);
      });

      it('should deploy just deb_b', () => {
        const deployedSource = execCmd<DeployResultJson>(
          `project deploy start ${metadataToArray(METADATA.JUST_DEB_B)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(deployedSource);

        assertSingleDEBAndItsDECounts(deployedSource, FULL_NAMES.DEB_B);
      });

      it('should deploy de_view_home of deb_b', () => {
        const deployedSource = execCmd<DeployResultJson>(
          `project deploy start ${metadataToArray(METADATA.DE_VIEW_HOME_OF_DEB_B)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(deployedSource);

        assertViewHome(deployedSource, 'b');
      });
    });
  });

  describe('retrieve (without local metadata)', () => {
    beforeEach(async () => {
      await deleteLocalSource(DEBS_RELATIVE_PATH, session.project.dir);
    });

    describe('individual metadata type', () => {
      it('should retrieve deb type (all debs - deb_a and deb_b)', async () => {
        const inboundFiles = execCmd<RetrieveResultJson>(
          `project retrieve start ${metadataToArray(METADATA.ALL_DEBS)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(inboundFiles);

        assertAllDEBAndTheirDECounts(inboundFiles);
      });

      it('should retrieve de type (all de components of deb_a and deb_b)', () => {
        const inboundFiles = execCmd<RetrieveResultJson>(
          `project retrieve start ${metadataToArray(METADATA.ALL_DE)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(inboundFiles);

        assertDECountsOfAllDEB(inboundFiles);
      });
    });

    describe('individual metadata item', () => {
      it('should retrieve all de components of deb_b', () => {
        const inboundFiles = execCmd<RetrieveResultJson>(
          `project retrieve start ${metadataToArray(METADATA.ALL_DE_OF_DEB_B)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(inboundFiles);

        assertDECountOfSingleDEB(inboundFiles);
      });

      it('should retrieve just deb_b', () => {
        const inboundFiles = execCmd<RetrieveResultJson>(
          `project retrieve start ${metadataToArray(METADATA.JUST_DEB_B)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(inboundFiles);

        assertSingleDEBAndItsDECounts(inboundFiles, FULL_NAMES.DEB_B);
      });

      it('should retrieve de_view_home of deb_b', () => {
        const inboundFiles = execCmd<RetrieveResultJson>(
          `project retrieve start ${metadataToArray(METADATA.DE_VIEW_HOME_OF_DEB_B)} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput?.result.files;
        assert(inboundFiles);

        assertViewHome(inboundFiles, 'b');
      });
    });
  });

  describe('new site page', () => {
    it('should deploy new page (view and route de components) of deb_a', async () => {
      createDocumentDetailPageAInLocal(session.project.dir);

      const deployedSource = execCmd<DeployResultJson>(
        `project deploy start ${metadataToArray(METADATA.DE_DOCUMENT_DETAIL_PAGE_A)} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.files;
      assert(deployedSource);
      assertDocumentDetailPageA(deployedSource);
    });

    it('should delete the page (view and route de components) of deb_a', async () => {
      const deletedSource = execCmd<DeleteSourceJson>(
        `project delete source ${metadataToArray(METADATA.DE_DOCUMENT_DETAIL_PAGE_A)} --noprompt --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result?.deletedSource;
      assert(deletedSource);
      assertDocumentDetailPageA(deletedSource);
      await assertDocumentDetailPageADelete(session, true);
    });
  });
});
