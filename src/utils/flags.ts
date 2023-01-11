/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { resolve, extname } from 'path';
import { Flags } from '@oclif/core';
import { Messages } from '@salesforce/core';
import { PathInfo, TestLevel } from './types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-deploy-retrieve', 'validation', [
  'error.InvalidFlagPath',
  'error.ExpectedDirectory',
  'error.ExpectedFileOrDirToExist',
]);

const parsePathInfo = async (input: string, opts: { exists?: boolean }): Promise<PathInfo> => {
  if (opts.exists && !fs.existsSync(input)) {
    throw messages.createError('error.InvalidFlagPath', [input, messages.getMessage('error.ExpectedFileOrDirToExist')]);
  }

  const stat = await fs.promises.stat(input);

  if (stat.isDirectory()) {
    return { type: 'directory', path: input };
  }

  return { type: 'file', path: input };
};

interface FsError extends Error {
  code: string;
}

/**
 * Ensures that the specified directory exists. If it does not, it is created.
 */
async function ensureDirectoryPath(path: string): Promise<string> {
  const trimmedPath = path.trim();
  const resolvedPath = trimmedPath?.length ? resolve(trimmedPath) : '';

  try {
    const stats = await fs.promises.stat(resolvedPath);
    const isDir = stats.isDirectory();
    if (!isDir) {
      throw messages.createError('error.InvalidFlagPath', [path, messages.getMessage('error.ExpectedDirectory')]);
    }
  } catch (error: unknown) {
    const err = error as FsError;
    if (err.code !== 'ENOENT') {
      throw err;
    } else {
      await fs.promises.mkdir(resolvedPath, { recursive: true });
    }
  }
  return resolvedPath;
}

function resolveZipFileName(zipFileName?: string): string {
  if (!zipFileName) {
    return DEFAULT_ZIP_FILE_NAME;
  }
  // If no file extension was provided append, '.zip'
  return !extname(zipFileName) ? (zipFileName += '.zip') : zipFileName;
}

export const DEFAULT_ZIP_FILE_NAME = 'unpackaged.zip';
/**
 * Flag value is a directory path that may or may not exist. If it doesn't exist, then it will be created.
 */
export const ensuredDirFlag = Flags.custom<string>({
  parse: async (input) => ensureDirectoryPath(input),
});

export const testLevelFlag = Flags.custom<TestLevel>({
  char: 'l',
  parse: (input) => Promise.resolve(input as TestLevel),
  options: Object.values(TestLevel),
});

/**
 * Flag value could either be a file path or a directory path.
 */
export const fileOrDirFlag = Flags.custom<PathInfo, { exists?: boolean }>({
  parse: async (input, _, opts) => parsePathInfo(input, opts),
});

/**
 * Flag value is the name of a zip file that defaults to 'unpackaged.zip'.
 */
export const zipFileFlag = Flags.custom<string>({
  parse: async (input) => Promise.resolve(resolveZipFileName(input)),
});
