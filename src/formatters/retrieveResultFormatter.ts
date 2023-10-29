/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'node:path';
import { Ux } from '@salesforce/sf-plugins-core';
import { FileResponse, RetrieveMessage, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { NamedPackageDir, SfProject } from '@salesforce/core';
import { ensureArray } from '@salesforce/kit';
import { Formatter, isSdrSuccess, RetrieveResultJson } from '../utils/types';
import { sortFileResponses, asRelativePaths, tableHeader, getFileResponseSuccessProps } from '../utils/output';

export class RetrieveResultFormatter implements Formatter<RetrieveResultJson> {
  private files: FileResponse[];
  public constructor(
    private ux: Ux,
    private result: RetrieveResult,
    private packageNames: string[] = [],
    deleteResponses: FileResponse[] = []
  ) {
    this.files = (this.result.getFileResponses() ?? []).concat(deleteResponses);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getJson(): Promise<RetrieveResultJson> {
    const { zipFile, ...responseWithoutZip } = this.result.response;
    return { ...responseWithoutZip, files: this.files };
  }

  public async display(): Promise<void> {
    this.displaySuccesses();
    await this.displayPackages();
  }

  private displaySuccesses(): void {
    const successes = sortFileResponses(asRelativePaths(this.files.filter(isSdrSuccess)));

    if (!successes.length) {
      // a retrieve happened, but nothing was retrieved
      if (this.result.response.status) {
        this.ux.warn('Nothing retrieved');
      } else {
        // a retrieve didn't happen, probably because everything was ignored or there were no remote changes to retrieve
        this.ux.log('Nothing retrieved');
      }
    } else {
      const columns = {
        state: { header: 'State' },
        fullName: { header: 'Name' },
        type: { header: 'Type' },
        filePath: { header: 'Path' },
      };
      const options = { title: tableHeader('Retrieved Source'), 'no-truncate': true };
      this.ux.log();

      this.ux.table(getFileResponseSuccessProps(successes), columns, options);
    }

    const warnings = getWarnings(this.result);
    if (warnings.length) {
      this.ux.log();
      this.ux.table(
        warnings,
        { fileName: { header: 'File' }, problem: { header: 'Problem' } },
        { 'no-truncate': true, title: tableHeader('Warnings') }
      );
    }
  }

  private async displayPackages(): Promise<void> {
    const packages = await this.getPackages();
    if (packages?.length) {
      const columns = {
        name: { header: 'Package Name' },
        fullPath: { header: 'Converted Location' },
      };
      const title = 'Retrieved Packages';
      const options = { title: tableHeader(title), 'no-truncate': true };
      this.ux.log();
      this.ux.table(packages, columns, options);
    }
  }

  private async getPackages(): Promise<NamedPackageDir[]> {
    const projectPath = await SfProject.resolveProjectPath();
    return this.packageNames.map((name) => {
      const packagePath = path.join(projectPath, name);
      return { name, path: packagePath, fullPath: path.resolve(packagePath) };
    });
  }
}

const getWarnings = (result: RetrieveResult): RetrieveMessage[] => ensureArray(result?.response?.messages ?? []);
