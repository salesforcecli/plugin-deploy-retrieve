/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { Interfaces, Flags } from '@oclif/core';
import { PathInfo, TestLevel } from './types';

export const testLevelFlag = (
  opts: Partial<Interfaces.OptionFlag<TestLevel | undefined>> = {}
): Interfaces.OptionFlag<TestLevel | undefined> =>
  Flags.build<TestLevel | undefined>({
    char: 'l',
    parse: (input: string) => Promise.resolve(input as TestLevel),
    options: Object.values(TestLevel),
    ...opts,
  })();

const parsePathInfo = async (input: string, exists: boolean): Promise<PathInfo> => {
  if (exists && !fs.existsSync(input)) {
    throw new Error(`No file or directory found at ${input}`);
  }

  const stat = await fs.promises.stat(input);

  if (stat.isDirectory()) {
    return { type: 'directory', path: input };
  }

  return { type: 'file', path: input };
};

export const fileOrDirFlag = (
  opts: { exists?: boolean } & Partial<Interfaces.OptionFlag<PathInfo | undefined>> = {}
): Interfaces.OptionFlag<PathInfo | undefined> =>
  Flags.build<PathInfo | undefined>({
    parse: async (input: string) => parsePathInfo(input, opts.exists),
    ...opts,
  })();
