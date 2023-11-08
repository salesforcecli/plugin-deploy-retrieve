/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ConfigValue } from '@salesforce/core';

export enum ConfigVars {
  /**
   * Allow users to use the REST api for deployments.
   */
  ORG_METADATA_REST_DEPLOY = 'org-metadata-rest-deploy',
}

export default [
  {
    key: ConfigVars.ORG_METADATA_REST_DEPLOY,
    // @salesforce/core's Messages class is not used here because it's an expensive import to be used in an init hook
    description: 'Whether deployments use the Metadata REST API (true) or SOAP API (false, default value).',
    hidden: true,
    input: {
      validator: (value: ConfigValue): boolean => typeof value === 'string' && ['true', 'false'].includes(value),
      failedMessage: 'The config value can only be set to true or false',
    },
  },
];
