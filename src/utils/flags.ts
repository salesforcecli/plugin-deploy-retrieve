/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { resolve, extname } from 'path';
import { Interfaces, Flags } from '@oclif/core';
import { Messages } from '@salesforce/core';
import { PathInfo, TestLevel } from './types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-deploy-retrieve', 'validation', [
  'error.InvalidFlagPath',
  'error.ExpectedDirectory',
  'error.ExpectedFileOrDirToExist',
]);

type FileOrDirOpts = {
  exists?: boolean;
} & Partial<Interfaces.OptionFlag<PathInfo | undefined>>;

type ZipFileOpts = Partial<Interfaces.OptionFlag<string | undefined>>;

type EnsuredDirOpts = Partial<Interfaces.OptionFlag<string | undefined>>;

const parsePathInfo = async (input: string, opts: FileOrDirOpts): Promise<PathInfo> => {
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
  const trimmedPath = path?.trim();
  const resolvedPath = trimmedPath?.length ? resolve(trimmedPath) : null;

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
  // If no file extension was provided append, '.zip'
  if (zipFileName && !extname(zipFileName)) {
    zipFileName += '.zip';
  }
  return zipFileName || 'unpackaged.zip';
}

/**
 * Flag value is a directory path that may or may not exist. If it doesn't exist, then it will be created.
 */
export function ensuredDirFlag(opts: EnsuredDirOpts): Interfaces.OptionFlag<string>;
export function ensuredDirFlag(opts?: EnsuredDirOpts): Interfaces.OptionFlag<string | undefined>;
export function ensuredDirFlag(
  opts: EnsuredDirOpts = {}
): Interfaces.OptionFlag<string> | Interfaces.OptionFlag<string | undefined> {
  return Flags.build<string | undefined>({
    parse: async (input: string) => ensureDirectoryPath(input),
    ...opts,
  })();
}

export function testLevelFlag(
  opts: Partial<Interfaces.OptionFlag<TestLevel>> & ({ required: true } | { default: Interfaces.Default<TestLevel> })
): Interfaces.OptionFlag<TestLevel>;
export function testLevelFlag(
  opts?: Partial<Interfaces.OptionFlag<TestLevel>>
): Interfaces.OptionFlag<TestLevel | undefined>;
export function testLevelFlag(
  opts: Partial<Interfaces.OptionFlag<TestLevel>> = {}
): Interfaces.OptionFlag<TestLevel> | Interfaces.OptionFlag<TestLevel | undefined> {
  return Flags.build<TestLevel | undefined>({
    char: 'l',
    parse: (input: string) => Promise.resolve(input as TestLevel),
    options: Object.values(TestLevel),
    ...opts,
  })();
}

/**
 * Flag value could either be a file path or a directory path.
 */
export function fileOrDirFlag(
  opts: FileOrDirOpts & ({ required: true } | { default: Interfaces.Default<PathInfo> })
): Interfaces.OptionFlag<PathInfo>;
export function fileOrDirFlag(opts?: FileOrDirOpts): Interfaces.OptionFlag<PathInfo | undefined>;
export function fileOrDirFlag(
  opts: FileOrDirOpts = {}
): Interfaces.OptionFlag<PathInfo> | Interfaces.OptionFlag<PathInfo | undefined> {
  return Flags.build<PathInfo | undefined>({
    parse: async (input: string) => parsePathInfo(input, opts),
    ...opts,
  })();
}

/**
 * Flag value is the name of a zip file that defaults to 'unpackaged.zip'.
 */
export function zipFileFlag(
  opts: ZipFileOpts & ({ required: true } | { default: Interfaces.Default<string> })
): Interfaces.OptionFlag<string>;
export function zipFileFlag(opts?: ZipFileOpts): Interfaces.OptionFlag<string | undefined>;
export function zipFileFlag(
  opts: ZipFileOpts
): Interfaces.OptionFlag<string> | Interfaces.OptionFlag<string | undefined> {
  return Flags.build<string | undefined>({
    parse: async (input: string) => Promise.resolve(resolveZipFileName(input)),
    ...opts,
  })();
}
