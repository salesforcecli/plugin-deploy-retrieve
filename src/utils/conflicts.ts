/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ux } from '@oclif/core';
import { ConflictResponse } from '@salesforce/source-tracking';

export const writeConflictTable = (conflicts: ConflictResponse[]): void => {
  // Interfaces cannot be casted to Record<string, unknown> so we have to cast to unknown first
  // See https://github.com/microsoft/TypeScript/issues/15300
  ux.table(
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
