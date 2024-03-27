/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MetadataComponent, SourceComponent } from '@salesforce/source-deploy-retrieve';

export const isNonDecomposedCustomLabel = (cmp: SourceComponent | MetadataComponent): boolean =>
  cmp.type.strategies?.recomposition === 'startEmpty';
