/*
 * Copyright 2025, Salesforce, Inc.
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

import type { ConfigValue } from '@salesforce/core';
import { Messages } from '@salesforce/core/messages';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
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
