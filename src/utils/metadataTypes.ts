/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MetadataComponent, SourceComponent } from '@salesforce/source-deploy-retrieve';

/** true if it's the original, nonDecomposed CustomLabels type.  This returns false for customRegistry if they've overridden the type */
export const isNonDecomposedCustomLabels = (cmp: SourceComponent | MetadataComponent): boolean =>
  cmp.type.strategies?.transformer === 'nonDecomposed';
