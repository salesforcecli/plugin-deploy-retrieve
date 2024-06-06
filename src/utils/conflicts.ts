/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Ux } from '@salesforce/sf-plugins-core';
import { ConflictResponse } from '@salesforce/source-tracking';

const ux = new Ux();

export const writeConflictTable = (conflicts?: ConflictResponse[]): void => {
  if (!conflicts || conflicts.length === 0) {
    return;
  }
  ux.table(
    // Interfaces cannot be used as Record<string, unknown> so we have to make it a concrete type
    // See https://github.com/microsoft/TypeScript/issues/15300
    conflicts.map((c) => ({ state: c.state, fullName: c.fullName, type: c.type, filePath: c.filePath })),
    {
      state: { header: 'STATE' },
      fullName: { header: 'FULL NAME' },
      type: { header: 'TYPE' },
      filePath: { header: 'FILE PATH' },
    },
    { 'no-truncate': true }
  );
};
