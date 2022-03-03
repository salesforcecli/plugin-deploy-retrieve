/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Flags, Interfaces } from '@oclif/core';
import { resolveRestDeploy } from './config';
import { API, TestLevel } from './types';

export const apiFlag = (opts = {}): Interfaces.OptionFlag<API | undefined> => {
  return Flags.build<API | undefined>({
    options: Object.values(API),
    helpValue: `<${Object.values(API).join('|')}>`,
    defaultHelp: async (): Promise<API> => Promise.resolve(resolveRestDeploy()),
    parse: (input: string | undefined) => Promise.resolve(input as API),
    ...opts,
  })();
};

export const testLevelFlag = (opts = {}): Interfaces.OptionFlag<TestLevel | undefined> => {
  return Flags.build<TestLevel | undefined>({
    options: Object.values(TestLevel),
    default: TestLevel.NoTestRun,
    parse: (input: string | undefined) => Promise.resolve(input as TestLevel),
    ...opts,
  })();
};
