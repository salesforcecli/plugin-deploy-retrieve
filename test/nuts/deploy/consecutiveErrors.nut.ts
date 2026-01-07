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

import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { expect } from 'chai';
import sinon from 'sinon';
import { SourceTestkit } from '@salesforce/source-testkit';
import { AuthInfo, Connection, Org } from '@salesforce/core';
import DeployMetadata from '../../../src/commands/project/deploy/start.js';

/**
 * Tests for verifying that deploy commands properly throw errors when
 * consecutive polling errors exceed the configured limit.
 *
 * see https://github.com/forcedotcom/source-deploy-retrieve/pull/1663
 */
describe('Deploy Consecutive Errors NUT', () => {
  let testkit: SourceTestkit;
  let orgUsername: string;

  const sinonSandbox = sinon.createSandbox();

  // Use a low retry limit to avoid needing many mocked responses
  const ERROR_RETRY_LIMIT = 5;

  before(async () => {
    // Set the environment variable to reduce retry limit for testing
    process.env.SF_METADATA_POLL_ERROR_RETRY_LIMIT = String(ERROR_RETRY_LIMIT);

    testkit = await SourceTestkit.create({
      nut: fileURLToPath(import.meta.url),
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    });
    orgUsername = testkit.username;
  });

  after(async () => {
    delete process.env.SF_METADATA_POLL_ERROR_RETRY_LIMIT;
    await testkit?.clean();
  });

  afterEach(() => {
    sinonSandbox.restore();
  });

  /**
   * Creates a stubbed connection that will throw errors during checkDeployStatus calls.
   * The connection is injected by stubbing Org.create to return an org with our stubbed connection.
   *
   * @param username - The org username to stub
   * @param errorMessage - The error message to throw during checkDeployStatus
   * @returns The stubbed connection for additional configuration
   */
  const stubConnectionWithDeployStatusErrors = async (
    username: string,
    errorMessage: string
  ): Promise<{ connection: Connection; checkDeployStatusStub: sinon.SinonStub }> => {
    const connection = await Connection.create({
      authInfo: await AuthInfo.create({ username }),
    });

    // Stub checkDeployStatus to throw a retryable error
    const checkDeployStatusStub = sinonSandbox
      .stub(connection.metadata, 'checkDeployStatus')
      .rejects(new Error(errorMessage));

    // Save original Org.create function to call in the fake
    const orgCreateFn = Org.create.bind(Org);
    sinonSandbox.stub(Org, 'create').callsFake(async (opts) => {
      const org = (await orgCreateFn(opts)) as Org;
      // @ts-expect-error re-assigning a private property
      org.connection = connection;
      return org;
    });

    return { connection, checkDeployStatusStub };
  };

  it('should throw error when consecutive retryable errors exceed the limit (socket hang up)', async () => {
    const retryableError = 'socket hang up';

    await stubConnectionWithDeployStatusErrors(orgUsername, retryableError);

    try {
      await DeployMetadata.run([
        '--source-dir',
        path.join(testkit.projectDir, 'force-app'),
        '-o',
        orgUsername,
        '--wait',
        '1', // Short wait since we expect it to fail quickly
      ]);
      expect.fail('Expected command to throw consecutive error from SDR');
    } catch (error) {
      const err = error as Error;
      expect(err.message).to.include('Exceeded maximum of 5 consecutive retryable errors. Last error: socket hang up');
    }
  });

  it('should throw error when consecutive retryable errors exceed the limit (ECONNRESET)', async () => {
    const retryableError = 'ECONNRESET';

    await stubConnectionWithDeployStatusErrors(orgUsername, retryableError);

    try {
      await DeployMetadata.run([
        '--source-dir',
        path.join(testkit.projectDir, 'force-app'),
        '-o',
        orgUsername,
        '--wait',
        '1',
      ]);
      expect.fail('Expected command to throw consecutive error from SDR');
    } catch (error) {
      const err = error as Error;
      expect(err.message).to.include('Exceeded maximum of 5 consecutive retryable errors. Last error: ECONNRESET');
    }
  });

  it('should throw error when consecutive retryable errors exceed the limit (ETIMEDOUT)', async () => {
    const retryableError = 'ETIMEDOUT';

    await stubConnectionWithDeployStatusErrors(orgUsername, retryableError);

    try {
      await DeployMetadata.run([
        '--source-dir',
        path.join(testkit.projectDir, 'force-app'),
        '-o',
        orgUsername,
        '--wait',
        '1',
      ]);
      expect.fail('Expected command to throw consecutive error from SDR');
    } catch (error) {
      const err = error as Error;
      expect(err.message).to.include('Exceeded maximum of 5 consecutive retryable errors. Last error: ETIMEDOUT');
    }
  });

  it('should throw error when consecutive retryable errors exceed the limit (ERROR_HTTP_503)', async () => {
    const retryableError = 'ERROR_HTTP_503';

    await stubConnectionWithDeployStatusErrors(orgUsername, retryableError);

    try {
      await DeployMetadata.run([
        '--source-dir',
        path.join(testkit.projectDir, 'force-app'),
        '-o',
        orgUsername,
        '--wait',
        '1',
      ]);
      expect.fail('Expected command to throw consecutive error from SDR');
    } catch (error) {
      const err = error as Error;
      expect(err.message).to.include('Exceeded maximum of 5 consecutive retryable errors. Last error: ERROR_HTTP_503');
    }
  });

  it('should continue polling and succeed when errors occur but do not exceed the limit', async () => {
    const retryableError = 'socket hang up';
    const { connection, checkDeployStatusStub } = await stubConnectionWithDeployStatusErrors(
      orgUsername,
      retryableError
    );

    // Make the stub throw errors for the first few calls, then succeed
    // Number of errors is less than the limit, so it should recover
    const errorsToThrow = ERROR_RETRY_LIMIT - 2; // Below the limit
    let callCount = 0;

    checkDeployStatusStub.restore();
    sinonSandbox.stub(connection.metadata, 'checkDeployStatus').callsFake(async () => {
      callCount++;
      if (callCount <= errorsToThrow) {
        throw new Error(retryableError);
      }
      // Return a successful/completed deploy status
      return {
        id: 'mockDeployId',
        done: true,
        status: 'Succeeded',
        success: true,
        numberComponentsDeployed: 1,
        numberComponentsTotal: 1,
        numberComponentErrors: 0,
        details: {},
      } as unknown as ReturnType<Connection['metadata']['checkDeployStatus']>;
    });

    // This should succeed because errors don't exceed the limit
    const result = await DeployMetadata.run([
      '--source-dir',
      path.join(testkit.projectDir, 'force-app'),
      '-o',
      orgUsername,
      '--wait',
      '5',
      '--json',
    ]);

    expect(result.id).to.equal('mockDeployId');
    expect(result.status).to.equal('Succeeded');
    expect(result.numberComponentsTotal).to.equal(1);
    expect(result.numberComponentsDeployed).to.equal(1);
    expect(result.numberComponentErrors).to.equal(0);
    // The deploy should eventually succeed after recovering from errors
    expect(callCount).to.be.greaterThan(errorsToThrow);
  });
});
