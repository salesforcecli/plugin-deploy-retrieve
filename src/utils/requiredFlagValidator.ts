/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'required.flag');

export function validateOneOfCommandFlags(oneOf: string[], flags: { [name: string]: unknown }): void {
  if (!Object.keys(flags).some((flag) => oneOf.includes(flag))) {
    throw messages.createError('errors.RequiredOneOfFlagsMissing', [oneOf.join(', ')]);
  }
}
