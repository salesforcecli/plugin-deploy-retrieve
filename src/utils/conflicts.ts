/*
 * Copyright 2026, Salesforce, Inc.
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
