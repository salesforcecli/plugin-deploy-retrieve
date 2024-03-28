/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MetadataComponent, SourceComponent } from '@salesforce/source-deploy-retrieve';

/** true if it's the original, nonDecomposed CustomLabel(s) type (either the parent or the child).  This returns false for customRegistry if they've overridden the type */
export const isNonDecomposedCustomLabelsOrCustomLabel = (cmp: SourceComponent | MetadataComponent): boolean =>
  [cmp, cmp.parent].some(isDecomposed);

/** true if it's the original, nonDecomposed CustomLabels (the parent).  This returns false for customRegistry if they've overridden the type */
export const isNonDecomposedCustomLabels = (cmp: SourceComponent | MetadataComponent): boolean => isDecomposed(cmp);

/** true if it's the original, nonDecomposed CustomLabels (the parent).  This returns false for customRegistry if they've overridden the type */
export const isNonDecomposedCustomLabel = (cmp: SourceComponent | MetadataComponent): boolean =>
  isDecomposed(cmp.parent);

const isDecomposed = (cmp?: SourceComponent | MetadataComponent): boolean =>
  cmp?.type.strategies?.transformer === 'nonDecomposed';
