/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ConfigAggregator, SfdxPropertyKeys } from '@salesforce/core';

export const resolveRestDeploy = function (flag: 'SOAP' | 'REST'): 'SOAP' | 'REST' {
  if (flag === 'SOAP') return 'SOAP';
  const restDeployConfig = ConfigAggregator.getValue(SfdxPropertyKeys.REST_DEPLOY).value;

  if (restDeployConfig === 'false') {
    return 'SOAP';
  } else if (restDeployConfig === 'true') {
    return 'REST';
  } else {
    return 'SOAP';
  }
};
