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
import * as fs from 'node:fs';

import { resolve, extname } from 'node:path';
import { Flags } from '@oclif/core';
import { Messages, Lifecycle } from '@salesforce/core';
import { PathInfo, TestLevel, reportsFormatters } from './types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'validation');
const commonFlagMessages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'commonFlags');

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
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      throw error;
    } else {
      await fs.promises.mkdir(resolvedPath, { recursive: true });
    }
  }
  return resolvedPath;
}

const resolveZipFileName = (zipFileName?: string): string => {
  if (!zipFileName) {
    return DEFAULT_ZIP_FILE_NAME;
  }
  // If no file extension was provided append, '.zip'
  return !extname(zipFileName) ? `${zipFileName}.zip` : zipFileName;
};

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
  default: async (context) => Promise.resolve(context.flags.tests ? TestLevel.RunSpecifiedTests : undefined),
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

export const testsFlag = Flags.custom({
  char: 't',
  multiple: true,
  summary: commonFlagMessages.getMessage('flags.tests.summary'),
  description: commonFlagMessages.getMessage('flags.tests.description'),
  // the old version allowed comma separated values, and the change is confusing enough to deserve a warning
  parse: async (input: string): Promise<string> =>
    commaWarningForMultipleFlags(
      input,
      commonFlagMessages.getMessage('commaWarningForTests', [commonFlagMessages.getMessage('flags.tests.description')])
    ),
});

export const coverageFormattersFlag = Flags.custom({
  multiple: true,
  summary: commonFlagMessages.getMessage('flags.coverage-formatters.summary'),
  description: commonFlagMessages.getMessage('flags.coverage-formatters.description'),
  options: reportsFormatters,
});

/**
 * use when the old version allowed comma separated values, and the change is confusing enough to deserve a warning
 * Put this as the parse function, like the testsFlag above
 *
 */
const commaWarningForMultipleFlags = async (input: string, warningText: string): Promise<string> => {
  if (input.includes(',')) {
    await Lifecycle.getInstance().emitWarning(warningText);
  }
  return input;
};

/**
 * Returns `true` if the metadata entry (e.g., --metadata) contains a pseudo type
 * such as "Agent" or "Agent:My_Agent".
 */
export const isPseudoType = (mdEntry: string): boolean => mdEntry.split(':')[0] === 'Agent';
