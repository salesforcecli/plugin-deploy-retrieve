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
  ux.table({
    data: conflicts,
    columns: [
      { key: 'state', name: 'STATE' },
      { key: 'fullName', name: 'FULL NAME' },
      { key: 'type', name: 'TYPE' },
      { key: 'filePath', name: 'FILE PATH' },
    ],
    overflow: 'wrap',
  });
};
