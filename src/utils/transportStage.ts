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
import type { TransportStageEvent } from '@salesforce/source-deploy-retrieve';

const MAX_NAMES = 5;

/**
 * Build the progress line for a transport stage event, e.g.
 * `Elastic Compute: uploading 2 component(s) (App1, App2)`.
 *
 * Use `check` for check-only deploys (validate, --dry-run), where the transport packages and checks
 * components without uploading them.
 *
 * Returns undefined for the `error` stage: that failure is reported once, by the error the pipeline rethrows.
 */
export const formatTransportStage = (
  event: TransportStageEvent,
  direction: 'upload' | 'download' | 'check'
): string | undefined => {
  if (event.stage === 'start') {
    const { componentNames } = event;
    const names =
      componentNames.length <= MAX_NAMES
        ? componentNames.join(', ')
        : `${componentNames.slice(0, MAX_NAMES).join(', ')} +${componentNames.length - MAX_NAMES} more`;
    return `${event.label}: ${direction}ing ${event.componentCount} component(s) (${names})`;
  }
  if (event.stage === 'complete') {
    return `${event.label}: ${direction} complete`;
  }
  return undefined;
};
