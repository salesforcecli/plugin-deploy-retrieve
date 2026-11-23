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
import { expect } from 'chai';
import type { TransportStageEvent } from '@salesforce/source-deploy-retrieve';
import { formatTransportStage } from '../../src/utils/transportStage.js';

const event = (overrides: Partial<TransportStageEvent>): TransportStageEvent => ({
  transportName: 'computeApp',
  label: 'Elastic Compute',
  operation: 'deploy',
  stage: 'start',
  componentCount: 2,
  componentNames: ['App1', 'App2'],
  ...overrides,
});

describe('formatTransportStage', () => {
  it('lists every component name on start when there are 5 or fewer', () => {
    expect(formatTransportStage(event({}), 'upload')).to.equal(
      'Elastic Compute: uploading 2 component(s) (App1, App2)'
    );
  });

  it('truncates component names after 5 and reports how many more', () => {
    const names = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];
    expect(formatTransportStage(event({ componentCount: 7, componentNames: names }), 'download')).to.equal(
      'Elastic Compute: downloading 7 component(s) (A1, A2, A3, A4, A5 +2 more)'
    );
  });

  it('does not truncate at exactly 5 names', () => {
    const names = ['A1', 'A2', 'A3', 'A4', 'A5'];
    expect(formatTransportStage(event({ componentCount: 5, componentNames: names }), 'upload')).to.equal(
      'Elastic Compute: uploading 5 component(s) (A1, A2, A3, A4, A5)'
    );
  });

  it('reports completion for the given direction', () => {
    expect(formatTransportStage(event({ stage: 'complete' }), 'upload')).to.equal('Elastic Compute: upload complete');
    expect(formatTransportStage(event({ stage: 'complete' }), 'download')).to.equal(
      'Elastic Compute: download complete'
    );
  });

  it('returns nothing for the error stage, which is reported by the rethrown error', () => {
    expect(formatTransportStage(event({ stage: 'error', errorMessage: 'boom' }), 'upload')).to.be.undefined;
  });
});
