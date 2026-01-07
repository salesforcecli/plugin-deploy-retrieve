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
