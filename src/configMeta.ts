/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConfigValue } from '@salesforce/core';
import { Messages } from '@salesforce/core/lib/messages.js';

Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'config');

export enum ConfigVars {
  /**
   * Allow users to use the REST api for deployments.
   */
  ORG_METADATA_REST_DEPLOY = 'org-metadata-rest-deploy',
}

export default [
  {
    key: ConfigVars.ORG_METADATA_REST_DEPLOY,
    description: messages.getMessage(ConfigVars.ORG_METADATA_REST_DEPLOY),
    hidden: true,
    input: {
      validator: (value: ConfigValue): boolean => typeof value === 'string' && ['true', 'false'].includes(value),
      failedMessage: messages.getMessage('error.invalidBooleanConfigValue'),
    },
  },
];
