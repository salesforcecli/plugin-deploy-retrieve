/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'node:fs';
import { join } from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert, expect } from 'chai';
import { PreviewResult } from '../../../src/utils/previewOutput';
import { DeleteTrackingResult } from '../../../src/commands/project/delete/tracking';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types';

// import { SourceTrackingClearResult } from '../../../src/commands/force/source/tracking/clear';
// import { PullResponse } from '../../../src/formatters/source/pullFormatter';
import { FILE_RELATIVE_PATHS, TEST_SESSION_OPTIONS, TYPES } from './constants';
import {
  assertAllDEBAndTheirDECounts,
  assertDEBMeta,
  assertDocumentDetailPageA,
  assertDocumentDetailPageAChanges,
  assertDocumentDetailPageADelete,
  assertNoLocalChanges,
  assertViewHome,
  assertViewHomeStatus,
  createDocumentDetailPageAInLocal,
  deleteDocumentDetailPageAInLocal,
  previewFileResponseToFileResponse,
} from './helper';

describe('deb -- tracking/push/pull', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create(TEST_SESSION_OPTIONS);
  });

  after(async () => {
    await session?.clean();
  });

  it('should push the whole project', async () => {
    const pushedSource = execCmd<DeployResultJson>('project deploy start --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.files;
    assert(pushedSource, 'No source pushed');
    assertAllDEBAndTheirDECounts(pushedSource, 10);
  });

  it('should see local change in deb_b', async () => {
    const debMetaFilePathB = join(session.project.dir, FILE_RELATIVE_PATHS.DEB_META_B);
    const original = await fs.promises.readFile(debMetaFilePathB, 'utf8');
    await fs.promises.writeFile(debMetaFilePathB, original.replace('meta space b', 'meta space b updated'));

    const statusResult = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.toDeploy;

    assert(statusResult, 'No status result');
    assertDEBMeta(previewFileResponseToFileResponse(statusResult), 'b');
  });

  it('should push local change in deb_b', async () => {
    const pushedSource = execCmd<DeployResultJson>('project deploy start --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.files;
    assert(pushedSource, 'No source pushed');

    assertDEBMeta(pushedSource, 'b');
    assertNoLocalChanges();
  });

  it('should see local change in de_view_home_content of deb_b', async () => {
    const deViewHomeContentFilePathB = join(session.project.dir, FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_B);
    const original = await fs.promises.readFile(deViewHomeContentFilePathB, 'utf8');
    await fs.promises.writeFile(
      deViewHomeContentFilePathB,
      original.replace('Start Building Your Page', 'Start Building Your Page Updated')
    );

    const statusResult = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    assert(statusResult, 'No status result');

    assertViewHomeStatus(previewFileResponseToFileResponse(statusResult.toDeploy), 'b');
  });

  it('should push local change in de_view_home_content of deb_b', async () => {
    const pushedSource = execCmd<DeployResultJson>('project deploy start --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.files;
    assert(pushedSource, 'No source pushed');

    assertViewHome(pushedSource, 'b');
    assertNoLocalChanges();
  });

  it('should see local change in de_view_home_meta of deb_b', async () => {
    const deViewHomeMetaFilePathB = join(session.project.dir, FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_B);
    await fs.promises.writeFile(
      deViewHomeMetaFilePathB,
      // write some very spacey json
      JSON.stringify(
        {
          apiName: 'home',
          path: 'views',
          type: 'sfdc_cms__view',
        },
        undefined,
        20
      )
    );

    const statusResult = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    assert(statusResult, 'No status result');

    assertViewHomeStatus(previewFileResponseToFileResponse(statusResult?.toDeploy), 'b');
  });

  it('should push local change in de_view_home_meta of deb_b', async () => {
    const pushedSource = execCmd<DeployResultJson>('project deploy start --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.files;
    assert(pushedSource, 'No source pushed');

    assertViewHome(pushedSource, 'b');
    assertNoLocalChanges();
  });

  it('should pull all debs after clearing source tracking info', () => {
    execCmd<DeleteTrackingResult>('project delete tracking --no-prompt', {
      ensureExitCode: 0,
    });

    const pulledSource = execCmd<RetrieveResultJson>('project retrieve start --ignore-conflicts --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.files;
    assert(pulledSource, 'No source pulled');

    assertAllDEBAndTheirDECounts(pulledSource, 0, false);
  });

  it('should not see any local/remote changes in deb/de', () => {
    const statusResult = execCmd<PreviewResult>('project deploy preview --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    assert(statusResult, 'No status result');
    expect(statusResult.toDeploy.every((s) => s.type !== TYPES.DE?.name && s.type !== TYPES.DEB.name)).to.be.true;
    expect(statusResult.toDelete.every((s) => s.type !== TYPES.DE?.name && s.type !== TYPES.DEB.name)).to.be.true;
  });

  describe('new site page', () => {
    it('should see locally added page (view and route de components) in deb_a', async () => {
      createDocumentDetailPageAInLocal(session.project.dir);

      const statusResult = execCmd<PreviewResult>('project deploy preview  --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(statusResult, 'No status result');

      assertDocumentDetailPageAChanges(previewFileResponseToFileResponse(statusResult?.toDeploy));
    });

    it('should push locally added page (view and route de components) in deb_a', async () => {
      const pushedSource = execCmd<DeployResultJson>('project deploy start --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result.files;
      assert(pushedSource, 'No source pushed');

      assertDocumentDetailPageA(pushedSource);
      assertNoLocalChanges();
    });

    it('should see locally deleted page (view and route de components) in deb_a', async () => {
      await deleteDocumentDetailPageAInLocal(session.project.dir);

      const statusResult = execCmd<PreviewResult>('project deploy preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      assert(statusResult, 'No status result');
      assertDocumentDetailPageAChanges(previewFileResponseToFileResponse(statusResult.toDelete));
    });

    it('should push local delete change in deb_a [locally deleted page (view and route de components)]', async () => {
      const pushedSource = execCmd<DeployResultJson>('project deploy start --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result.files;
      assert(pushedSource, 'No source pushed');

      assertDocumentDetailPageA(pushedSource);
      assertNoLocalChanges();

      await assertDocumentDetailPageADelete(session, false);
    });
  });
});
