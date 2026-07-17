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
import { resolveResumeVerbose } from '../../../src/commands/project/deploy/resume.js';

describe('project deploy resume', () => {
  it('disables cached verbose output when quiet', () => {
    expect(resolveResumeVerbose({ quiet: true }, { verbose: true })).to.equal(false);
  });

  it('keeps cached verbosity when quiet is not set', () => {
    expect(resolveResumeVerbose({ verbose: false }, { verbose: true })).to.equal(false);
    expect(resolveResumeVerbose({}, { verbose: true })).to.equal(true);
  });

  it('lets a current --concise request override cached verbose', () => {
    // a fresh `--concise` must win over a cached `verbose: true` from the original deploy
    expect(resolveResumeVerbose({ concise: true }, { verbose: true })).to.equal(false);
  });
});
