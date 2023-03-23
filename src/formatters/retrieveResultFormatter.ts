/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { ux } from '@oclif/core';
import { FileResponse, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { NamedPackageDir, SfProject } from '@salesforce/core';
import { Formatter, isSdrSuccess, RetrieveResultJson } from '../utils/types';
import { sortFileResponses, asRelativePaths, tableHeader, getFileResponseSuccessProps } from '../utils/output';

export class RetrieveResultFormatter implements Formatter<RetrieveResultJson> {
  private files: FileResponse[];
  public constructor(
    private result: RetrieveResult,
    private packageNames: string[] = [],
    deleteResponses: FileResponse[] = []
  ) {
    this.files = (this.result.getFileResponses() ?? []).concat(deleteResponses);
  }

  public getJson(): RetrieveResultJson {
    const { zipFile, ...responseWithoutZip } = this.result.response;
    return { ...responseWithoutZip, files: this.files };
  }

  public async display(): Promise<void> {
    this.displaySuccesses();
    await this.displayPackages();
  }

  private displaySuccesses(): void {
    const successes = sortFileResponses(asRelativePaths(this.files.filter(isSdrSuccess)));

    if (!successes.length) return;

    const columns = {
      state: { header: 'State' },
      fullName: { header: 'Name' },
      type: { header: 'Type' },
      filePath: { header: 'Path' },
    };
    const title = 'Retrieved Source';
    const options = { title: tableHeader(title) };
    ux.log();

    ux.table(getFileResponseSuccessProps(successes), columns, options);
  }

  private async displayPackages(): Promise<void> {
    const packages = await this.getPackages();
    if (packages?.length) {
      const columns = {
        name: { header: 'Package Name' },
        fullPath: { header: 'Converted Location' },
      };
      const title = 'Retrieved Packages';
      const options = { title: tableHeader(title) };
      ux.log();
      ux.table(packages, columns, options);
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
