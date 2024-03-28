/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// The types in here is copied from plugin-source.  Used by the tracking NUTs to validate that behavior is identical between the two plugins.
type StatusActualState = 'Deleted' | 'Add' | 'Changed' | 'Unchanged';
type StatusOrigin = 'Local' | 'Remote';
type StatusStateString = `${StatusOrigin} ${StatusActualState}` | `${StatusOrigin} ${StatusActualState} (Conflict)`;

export type StatusResult = {
  state: StatusStateString;
  fullName: string;
  type: string;
  filePath?: string;
  ignored?: boolean;
  conflict?: boolean;
  actualState?: StatusActualState;
  origin: StatusOrigin;
};
