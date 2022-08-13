/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';

Messages.importMessagesDirectory(__dirname);
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

export const DEPLOY_STATUS_CODES_DESCRIPTIONS = [...DEPLOY_STATUS_CODES.entries()].reduce(
  (result, [status, code]) => ({
    ...result,
    [`${status} (${code})`]: messages.getMessage(`errorCode.deploy.${status}`),
  }),
  {}
);
