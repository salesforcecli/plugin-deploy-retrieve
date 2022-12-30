/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Global, TTLConfig } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { JsonMap } from '@salesforce/ts-types';
import { CachedOptions, cacheMessages } from './deploy';

export class DeployCache extends TTLConfig<TTLConfig.Options, CachedOptions> {
  public static getFileName(): string {
    return 'deploy-cache.json';
  }

  public static getDefaultOptions(): TTLConfig.Options {
    return {
      isGlobal: false,
      isState: true,
      filename: DeployCache.getFileName(),
      stateFolder: Global.SF_STATE_FOLDER,
      ttl: Duration.days(3),
    };
  }

  public static async set(key: string, value: Partial<CachedOptions>): Promise<void> {
    const cache = await DeployCache.create();
    cache.set(key, value);
    await cache.write();
  }

  public static async unset(key: string): Promise<void> {
    const cache = await DeployCache.create();
    cache.unset(key);
    await cache.write();
  }

  public static async update(key: string, obj: JsonMap): Promise<void> {
    const cache = await DeployCache.create();
    cache.update(key, obj);
    await cache.write();
  }

  public resolveLatest(useMostRecent: boolean, key: string | undefined, throwOnNotFound = true): string {
    const keyFromLatest = useMostRecent ? this.getLatestKey() : key;
    if (!keyFromLatest) throw cacheMessages.createError('error.NoRecentJobId');

    const jobId = this.resolveLongId(keyFromLatest);

    if (throwOnNotFound && !this.has(jobId)) {
      throw cacheMessages.createError('error.InvalidJobId', [jobId]);
    }

    return jobId;
  }

  public resolveLongId(jobId: string): string {
    if (jobId.length === 18) {
      return jobId;
    } else if (jobId.length === 15) {
      const match = this.keys().find((k) => k.startsWith(jobId));
      if (match) {
        return match;
      }
      throw cacheMessages.createError('error.InvalidJobId', [jobId]);
    } else {
      throw cacheMessages.createError('error.InvalidJobId', [jobId]);
    }
  }

  public get(jobId: string): TTLConfig.Entry<CachedOptions> {
    return super.get(this.resolveLongId(jobId));
  }
}
