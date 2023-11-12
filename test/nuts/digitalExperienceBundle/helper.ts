/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join, relative } from 'node:path';
import * as fs from 'node:fs';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { assert, expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { PreviewFile, PreviewResult } from '../../../src/utils/previewOutput.js';
import { DIR_RELATIVE_PATHS, FILE_RELATIVE_PATHS, FULL_NAMES, STORE, TYPES } from './constants.js';

type CustomFileResponses = Array<Pick<FileResponse, 'filePath' | 'fullName' | 'type'>>;

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

export const previewFileResponseToFileResponse = (previews: PreviewFile[]): CustomFileResponses =>
  previews.map((p) => ({ fullName: p.fullName, type: p.type, filePath: p.path }));

export function assertAllDEBAndTheirDECounts(
  resp: CustomFileResponses,
  otherComponentsCount = 0,
  assertTotalCount = true
) {
  if (assertTotalCount) expect(resp).to.have.length(104 + otherComponentsCount);

  expect(
    resp.reduce(
      (acc: [number, number, number, number], curr) => {
        assert(TYPES.DE);
        if (curr.type === TYPES.DE?.name && curr.fullName.includes(FULL_NAMES.DEB_A)) acc[0]++;
        if (curr.type === TYPES.DE?.name && curr.fullName.includes(FULL_NAMES.DEB_B)) acc[1]++;
        if (curr.type === TYPES.DEB.name && curr.fullName === FULL_NAMES.DEB_A) acc[2]++;
        if (curr.type === TYPES.DEB.name && curr.fullName === FULL_NAMES.DEB_B) acc[3]++;
        return acc;
      },
      [0, 0, 0, 0]
    ),
    JSON.stringify(resp)
  ).to.deep.equal([51, 51, 1, 1]);
}

export function assertSingleDEBAndItsDECounts(resp: CustomFileResponses, debFullName: string) {
  expect(resp).to.have.length(52);
  expect(
    resp.reduce(
      (acc: [number, number], curr) => {
        if (curr.type === TYPES.DE?.name && curr.fullName.includes(debFullName)) acc[0]++;
        if (curr.type === TYPES.DEB.name && curr.fullName === debFullName) acc[1]++;
        return acc;
      },
      [0, 0]
    ),
    JSON.stringify(resp)
  ).to.deep.equal([51, 1]);
}

export function assertDECountsOfAllDEB(resp: CustomFileResponses) {
  expect(resp).to.have.length(102);
  expect(
    resp.reduce(
      (acc: [number, number], curr) => {
        if (curr.type === TYPES.DE?.name && curr.fullName.includes(FULL_NAMES.DEB_A)) acc[0]++;
        if (curr.type === TYPES.DE?.name && curr.fullName.includes(FULL_NAMES.DEB_B)) acc[1]++;
        return acc;
      },
      [0, 0]
    ),
    JSON.stringify(resp)
  ).to.deep.equal([51, 51]);
}

export function assertDECountOfSingleDEB(resp: CustomFileResponses) {
  expect(resp).to.have.length(51);
  expect(resp.every((s) => s.type === TYPES.DE?.name)).to.be.true;
}

export function assertDEBMeta(resp: CustomFileResponses, deb: 'a' | 'b') {
  expect(resp).to.have.length(1);
  assert(resp[0].filePath, `response has no filepath ${JSON.stringify(resp[0])}`);

  resp[0].filePath = relative(process.cwd(), resp[0].filePath);

  expect(resp[0]).to.include({
    type: TYPES.DEB.name,
    fullName: deb === 'a' ? FULL_NAMES.DEB_A : FULL_NAMES.DEB_B,
    filePath: deb === 'a' ? FILE_RELATIVE_PATHS.DEB_META_A : FILE_RELATIVE_PATHS.DEB_META_B,
  });
}

export function assertViewHome(resp: CustomFileResponses, deb: 'a' | 'b') {
  expect(resp).to.have.length(3);
  expect(
    resp.map((s) => ({
      type: s.type,
      fullName: s.fullName,
      filePath: relative(process.cwd(), s.filePath as string),
    }))
  ).to.have.deep.members([
    {
      type: TYPES.DE?.name,
      fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
      filePath: deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_B,
    },
    {
      type: TYPES.DE?.name,
      fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
      filePath:
        deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_FR_VARIANT_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_FR_VARIANT_B,
    },
    {
      type: TYPES.DE?.name,
      fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
      filePath: deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_B,
    },
  ]);
}

export function assertViewHomeStatus(resp: CustomFileResponses, deb: 'a' | 'b') {
  expect(resp).to.have.length(1);
  assert(resp[0].filePath, `response has no filepath ${JSON.stringify(resp[0])}`);
  resp[0].filePath = relative(process.cwd(), resp[0].filePath);

  expect(resp[0]).to.include({
    type: TYPES.DE?.name,
    fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
    filePath: deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_B,
  });
}

export function assertDocumentDetailPageAChanges(resp: CustomFileResponses) {
  expect(
    resp.map((s) => ({
      type: s.type,
      fullName: s.fullName,
      filePath: relative(process.cwd(), s.filePath as string),
    }))
  ).to.have.deep.members([
    {
      type: TYPES.DE?.name,
      fullName: FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_META_A,
    },

    {
      type: TYPES.DE?.name,
      fullName: FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_META_A,
    },
  ]);
  expect(resp).to.have.length(2);
}

export function assertDocumentDetailPageA(resp: CustomFileResponses) {
  expect(
    resp.map((s) => ({
      type: s.type,
      fullName: s.fullName,
      filePath: relative(process.cwd(), s.filePath as string),
    }))
  ).to.have.deep.members([
    {
      type: TYPES.DE?.name,
      fullName: FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_META_A,
    },
    {
      type: TYPES.DE?.name,
      fullName: FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_CONTENT_A,
    },
    {
      type: TYPES.DE?.name,
      fullName: FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_META_A,
    },
    {
      type: TYPES.DE?.name,
      fullName: FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_CONTENT_A,
    },
  ]);
  expect(resp).to.have.length(4);
}

export async function assertDocumentDetailPageADelete(session: TestSession, shouldBeDeletedInLocal: boolean) {
  const username = session.orgs.get('default')?.username;
  assert(username, 'username should be defined');
  assert(TYPES.DE?.name);
  expect(await isNameObsolete(username, TYPES.DE.name, FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A)).to.be.true;
  expect(await isNameObsolete(username, TYPES.DE.name, FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A)).to.be.true;

  if (shouldBeDeletedInLocal) {
    expect(fs.existsSync(join(session.project.dir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A))).to.be.false;
    expect(fs.existsSync(join(session.project.dir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A))).to.be.false;
  }
}

export function assertNoLocalChanges() {
  const statusResult = execCmd<PreviewResult>('project deploy preview --json', {
    ensureExitCode: 0,
  }).jsonOutput?.result;
  expect(statusResult?.toDelete).to.deep.equal([]);
  expect(statusResult?.toDeploy).to.deep.equal([]);
}

export function createDocumentDetailPageAInLocal(projectDir: string) {
  fs.cpSync(STORE.COMPONENTS.DE_VIEW_DOCUMENT_DETAIL, join(projectDir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A), {
    recursive: true,
  });

  fs.cpSync(
    STORE.COMPONENTS.DE_ROUTE_DOCUMENT_DETAIL,
    join(projectDir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A),
    {
      recursive: true,
    }
  );
}

export async function deleteDocumentDetailPageAInLocal(projectDir: string) {
  await fs.promises.rm(join(projectDir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A), { recursive: true });
  await fs.promises.rm(join(projectDir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A), { recursive: true });
}

export async function deleteLocalSource(sourceRelativePath: string, projectDir: string) {
  // delete and recreate an empty dir
  await fs.promises.rm(join(projectDir, sourceRelativePath), { recursive: true });
  await fs.promises.mkdir(join(projectDir, sourceRelativePath));
}

/** some of the constants for these tests were comma separated lists like the sfdx commands supported.  If you have one, this converts it to the new `multiple` flag style */
export const metadataToArray = (metadata: string): string => `--metadata ${metadata.split(',').join(' --metadata ')}`;
