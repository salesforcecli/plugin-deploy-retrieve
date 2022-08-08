/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { dirname, resolve, extname } from 'path';
import { Interfaces, Flags } from '@oclif/core';
import { Messages, SfError } from '@salesforce/core';
import { PathInfo, TestLevel } from './types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-deploy-retrieve', 'validation', [
  'error.InvalidFlagPath',
  'error.ExpectedDirectory',
  'error.ExpectedFile',
  'error.PathNotFound',
]);

type FileOrDirOpts = {
  exists?: boolean;
} & Partial<Interfaces.OptionFlag<PathInfo | undefined>>;

type ZipFileOpts = Partial<Interfaces.OptionFlag<string | undefined>>;

type EnsuredDirOpts = Partial<Interfaces.OptionFlag<string | undefined>>;

const parsePathInfo = async (input: string, opts: FileOrDirOpts): Promise<PathInfo> => {
  if (!opts.exists && !fs.existsSync(input)) {
    throw new Error(`No file or directory found at ${input}`);
  }

  const stat = await fs.promises.stat(input);

  if (stat.isDirectory()) {
    return { type: 'directory', path: input };
  }

  return { type: 'file', path: input };
};

type EnsureFsFlagOptions = {
  flagName: string;
  path: string;
  type: 'dir' | 'file' | 'any';
  throwOnENOENT?: boolean;
};

interface FsError extends Error {
  code: string;
}

/**
 * Ensures command flags that are file system paths are set properly before
 * continuing command execution.  Can also create directories that don't yet
 * exist in the path.
 *
 * @param options defines the path to resolve and the expectations
 * @returns the resolved flag path
 */
function ensureFlagPath(options: EnsureFsFlagOptions): string {
  const { flagName, path, type, throwOnENOENT } = options;

  const trimmedPath = path?.trim();
  const resolvedPath = trimmedPath?.length ? resolve(trimmedPath) : null;

  try {
    const stats = fs.statSync(resolvedPath);
    if (type !== 'any') {
      const isDir = stats.isDirectory();
      if (type === 'dir' && !isDir) {
        const msg = messages.getMessage('error.ExpectedDirectory');
        throw new SfError(messages.getMessage('error.InvalidFlagPath', [flagName, path, msg]), 'InvalidFlagPath');
      } else if (type === 'file' && isDir) {
        const msg = messages.getMessage('error.ExpectedFile');
        throw new SfError(messages.getMessage('error.InvalidFlagPath', [flagName, path, msg]), 'InvalidFlagPath');
      }
    }
  } catch (error: unknown) {
    const err = error as FsError;
    if (err.code !== 'ENOENT') {
      throw err;
    } else {
      if (throwOnENOENT) {
        const enoent = messages.getMessage('error.PathNotFound');
        throw new SfError(messages.getMessage('error.InvalidFlagPath', [flagName, path, enoent]), 'InvalidFlagPath');
      }
      const dir = type === 'dir' ? resolvedPath : dirname(resolvedPath);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  return resolvedPath;
}

/**
 * Flag value is a directory path that may or may not exist. If it doesn't exist, then it will be created.
 */
export const ensuredDirFlag = (opts: EnsuredDirOpts): Interfaces.OptionFlag<string | undefined> => {
  return Flags.build<string | undefined>({
    parse: async (input: string) => {
      return Promise.resolve(
        ensureFlagPath({
          flagName: opts.name,
          path: input,
          type: 'dir',
        })
      );
    },
    ...opts,
  })();
};

function resolveZipFileName(zipFileName?: string): string {
  // If no file extension was provided append, '.zip'
  if (zipFileName && !extname(zipFileName)) {
    zipFileName += '.zip';
  }
  return zipFileName || 'unpackaged.zip';
}

export const testLevelFlag = (
  opts: Partial<Interfaces.OptionFlag<TestLevel | undefined>> = {}
): Interfaces.OptionFlag<TestLevel | undefined> => {
  return Flags.build<TestLevel | undefined>({
    char: 'l',
    parse: (input: string) => Promise.resolve(input as TestLevel),
    options: Object.values(TestLevel),
    ...opts,
  })();
};

/**
 * Flag value could either be a file path or a directory path.
 */
export const fileOrDirFlag = (opts: FileOrDirOpts): Interfaces.OptionFlag<PathInfo | undefined> => {
  return Flags.build<PathInfo | undefined>({
    parse: async (input: string) => parsePathInfo(input, opts),
    ...opts,
  })();
};

/**
 * Flag value is the name of a zip file that defaults to 'unpackaged.zip'.
 */
export const zipFileFlag = (opts: ZipFileOpts): Interfaces.OptionFlag<string | undefined> => {
  return Flags.build<string | undefined>({
    parse: async (input: string) => Promise.resolve(resolveZipFileName(input)),
    ...opts,
  })();
};
