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
import { isCI, shouldShowDeployProgress, showDeployProgress } from '../../src/utils/deployStages.js';

describe('showDeployProgress', () => {
  const original = process.env.SF_DEPLOY_PROGRESS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SF_DEPLOY_PROGRESS;
    } else {
      process.env.SF_DEPLOY_PROGRESS = original;
    }
  });

  it('defaults to on when the env var is unset', () => {
    delete process.env.SF_DEPLOY_PROGRESS;
    expect(showDeployProgress()).to.equal(true);
  });

  it('treats falsey strings as off', () => {
    for (const value of ['false', '0', 'no']) {
      process.env.SF_DEPLOY_PROGRESS = value;
      expect(showDeployProgress(), value).to.equal(false);
    }
  });

  it('keeps progress on for truthy strings', () => {
    process.env.SF_DEPLOY_PROGRESS = 'true';
    expect(showDeployProgress()).to.equal(true);
  });
});

describe('shouldShowDeployProgress', () => {
  const original = process.env.SF_DEPLOY_PROGRESS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SF_DEPLOY_PROGRESS;
    } else {
      process.env.SF_DEPLOY_PROGRESS = original;
    }
  });

  it('disables progress in json mode', () => {
    process.env.SF_DEPLOY_PROGRESS = 'true';
    expect(shouldShowDeployProgress({ jsonEnabled: true })).to.equal(false);
  });

  it('disables progress when quiet is set', () => {
    process.env.SF_DEPLOY_PROGRESS = 'true';
    expect(shouldShowDeployProgress({ jsonEnabled: false, quiet: true })).to.equal(false);
  });

  it('disables progress when no-progress is set', () => {
    process.env.SF_DEPLOY_PROGRESS = 'true';
    expect(shouldShowDeployProgress({ jsonEnabled: false, noProgress: true })).to.equal(false);
  });

  it('falls back to env-driven progress when no suppressing flags are set', () => {
    process.env.SF_DEPLOY_PROGRESS = 'false';
    expect(shouldShowDeployProgress({ jsonEnabled: false })).to.equal(false);

    process.env.SF_DEPLOY_PROGRESS = 'true';
    expect(shouldShowDeployProgress({ jsonEnabled: false })).to.equal(true);
  });
});

describe('isCI', () => {
  const originalCI = process.env.CI;
  const originalContinuousIntegration = process.env.CONTINUOUS_INTEGRATION;

  afterEach(() => {
    if (originalCI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCI;
    }

    if (originalContinuousIntegration === undefined) {
      delete process.env.CONTINUOUS_INTEGRATION;
    } else {
      process.env.CONTINUOUS_INTEGRATION = originalContinuousIntegration;
    }
  });

  it('is false when CI markers are absent', () => {
    delete process.env.CI;
    delete process.env.CONTINUOUS_INTEGRATION;
    expect(isCI()).to.equal(false);
  });

  it('is true when CI is truthy and a CI marker is present', () => {
    process.env.CI = 'true';
    process.env.CONTINUOUS_INTEGRATION = 'true';
    expect(isCI()).to.equal(true);
  });
});
