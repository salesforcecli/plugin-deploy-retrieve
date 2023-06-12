/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ux } from '@oclif/core';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { StandardColors } from '@salesforce/sf-plugins-core';
import { tableHeader } from '../utils/output';
import { DeployResultFormatter } from './deployResultFormatter';

export class DeployReportResultFormatter extends DeployResultFormatter {
  public display(): void {
    ux.log(`${this.result.response.id}... ${this.result.response.status}`);

    const response = Object.entries(this.result.response).reduce<Array<{ key: string; value: unknown }>>(
      (result, [key, value]) => {
        if (['number', 'boolean', 'string'].includes(typeof value)) {
          if (key === 'status') {
            return result.concat({ key, value: colorStatus(value as RequestStatus) });
          } else {
            return result.concat({ key, value: value as string | number | boolean });
          }
        }
        return result;
      },
      []
    );

    ux.log();
    ux.table(response, { key: {}, value: {} }, { title: tableHeader('Deploy Info'), 'no-truncate': true });

    const opts = Object.entries(this.flags).reduce<Array<{ key: string; value: unknown }>>((result, [key, value]) => {
      if (key === 'timestamp') return result;
      if (key === 'target-org')
        return result.concat({ key: 'target-org', value: this.flags['target-org']?.getUsername() });
      return result.concat({ key, value });
    }, []);
    ux.log();
    ux.table(opts, { key: {}, value: {} }, { title: tableHeader('Deploy Options'), 'no-truncate': true });
    super.display();
  }
}

function colorStatus(status: RequestStatus): string {
  if (status === RequestStatus.Succeeded) return StandardColors.success(status);
  if (status === RequestStatus.Failed) return StandardColors.error(status);
  else return StandardColors.warning(status);
}
