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

import { join } from 'node:path';
import { TestSessionOptions } from '@salesforce/cli-plugins-testkit/lib/testSession.js';
import { registry } from '@salesforce/source-deploy-retrieve';
import { assert } from 'chai';

export const SOURCE_BASE_RELATIVE_PATH = join('force-app', 'main', 'default');
export const DEB_WEBAPP_NUTS_PATH = join(process.cwd(), 'test', 'nuts', 'digitalExperienceBundleWithWebapps');

export const TYPES = {
  DEB: registry.types.digitalexperiencebundle,
} as const;

export const DIR_NAMES = {
  PROJECT: 'project',
  DIGITAL_EXPERIENCES: TYPES.DEB.directoryName,
  WEB_APP: 'web_app',
  WEBAPP_NAME: 'WebApp',
} as const;

assert(DIR_NAMES.DIGITAL_EXPERIENCES);

export const WEBAPPS_RELATIVE_PATH = join(SOURCE_BASE_RELATIVE_PATH, DIR_NAMES.DIGITAL_EXPERIENCES, DIR_NAMES.WEB_APP);
export const WEBAPP_RELATIVE_PATH = join(WEBAPPS_RELATIVE_PATH, DIR_NAMES.WEBAPP_NAME);

export const FULL_NAMES = {
  WEBAPP: `${DIR_NAMES.WEB_APP}/${DIR_NAMES.WEBAPP_NAME}`,
} as const;

export const METADATA = {
  WEBAPP: `${TYPES.DEB.name}:${FULL_NAMES.WEBAPP}`,
  ALL_DEBS: TYPES.DEB.name,
};

export const TEST_SESSION_OPTIONS: TestSessionOptions = {
  project: {
    sourceDir: join(DEB_WEBAPP_NUTS_PATH, DIR_NAMES.PROJECT),
  },
  devhubAuthStrategy: 'AUTO',
  scratchOrgs: [
    {
      setDefault: true,
      config: join('config', 'project-scratch-def.json'),
    },
  ],
};
