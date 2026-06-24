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
import * as fs from 'node:fs';
import { expect } from 'chai';
import { WEBAPP_RELATIVE_PATH } from './constants.js';

/**
 * Delete local webapp source
 */
export async function deleteLocalSource(sourceRelativePath: string, projectDir: string): Promise<void> {
  const fullPath = join(projectDir, sourceRelativePath);
  if (fs.existsSync(fullPath)) {
    await fs.promises.rm(fullPath, { recursive: true });
    await fs.promises.mkdir(fullPath, { recursive: true });
  }
}

/**
 * Convert metadata string to array format for CLI commands
 */
export const metadataToArray = (metadata: string): string => `--metadata ${metadata.split(',').join(' --metadata ')}`;

/**
 * Verify webapp files exist locally after retrieve
 */
export function assertWebAppFilesExist(projectDir: string): void {
  const webappPath = join(projectDir, WEBAPP_RELATIVE_PATH);
  expect(fs.existsSync(webappPath), `WebApp directory should exist at ${webappPath}`).to.be.true;
  expect(fs.existsSync(join(webappPath, 'webapp.json')), 'webapp.json should exist').to.be.true;
  expect(fs.existsSync(join(webappPath, 'src', 'App.js')), 'src/App.js should exist').to.be.true;
}
