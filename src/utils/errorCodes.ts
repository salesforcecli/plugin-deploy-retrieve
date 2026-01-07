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

import { Messages } from '@salesforce/core';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-deploy-retrieve', 'errorCodes');

export const DEPLOY_STATUS_CODES = new Map<RequestStatus, number>([
  [RequestStatus.Succeeded, 0],
  [RequestStatus.Canceled, 1],
  [RequestStatus.Failed, 1],
  [RequestStatus.SucceededPartial, 68],
  [RequestStatus.InProgress, 69],
  [RequestStatus.Pending, 69],
  [RequestStatus.Canceling, 69],
]);

export const DEPLOY_STATUS_CODES_DESCRIPTIONS = Object.fromEntries(
  Array.from(DEPLOY_STATUS_CODES).map(([status, code]) => [
    `${status} (${code})`,
    messages.getMessage(`errorCode.deploy.${status}`),
  ])
);
