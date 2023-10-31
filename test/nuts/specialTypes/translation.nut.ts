/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { PreviewResult } from '../../../src/utils/previewOutput';
import { DeployResultJson, RetrieveResultJson } from '../../../src/utils/types';

describe('translations', () => {
  let session: TestSession;
  let projectPath: string;
  let translationPath: string;
  let fieldTranslationPath: string;

  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'test', 'nuts', 'specialTypes', 'customTranslationProject'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          duration: 1,
          setDefault: true,
          wait: 10,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });
    projectPath = path.join(session.project.dir, 'my-app', 'main', 'default');
    translationPath = path.join(projectPath, 'objectTranslations', 'customObject__c-es');
    fieldTranslationPath = path.join(
      projectPath,
      'objectTranslations',
      'customObject__c-es',
      'customField__c.fieldTranslation-meta.xml'
    );
  });

  after(async () => {
    await session?.clean();
  });
  describe('tracking/push', () => {
    it('can deploy the whole project', async () => {
      execCmd('project deploy start --json', {
        ensureExitCode: 0,
      });
    });

    it('modify and see local change', async () => {
      const fieldFile = path.join(translationPath, 'customField__c.fieldTranslation-meta.xml');
      const original = await fs.promises.readFile(fieldFile, 'utf8');
      await fs.promises.writeFile(fieldFile, original.replace('spanish', 'español'));
      const statusResult = execCmd<PreviewResult>('project deploy preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;

      expect(statusResult?.toDeploy[0].type).to.equal('CustomObjectTranslation');
    });

    it('push local change', async () => {
      const pushResult = execCmd<DeployResultJson>('project deploy start --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(pushResult?.files.every((s) => s.type === 'CustomObjectTranslation')).to.be.true;
    });

    it('sees no local changes', () => {
      const statusResult = execCmd<PreviewResult>('project deploy preview --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(statusResult?.toDeploy).to.deep.equal([]);
    });
  });

  describe('manifest', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    it('can generate manifest for translation types', async () => {
      execCmd('force:source:manifest:create -p my-app --json', { ensureExitCode: 0 });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('deploy', () => {
      const deployResults = execCmd<DeployResultJson>('project deploy start -x package.xml --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(deployResults?.files.length).to.equal(2);
    });

    it('retrieve without local metadata', async () => {
      // delete and recreate an empty dir
      await fs.promises.rm(path.join(session.project.dir, 'force-app'), { recursive: true });
      await fs.promises.mkdir(path.join(session.project.dir, 'force-app'));
      const retrieveResults = execCmd<RetrieveResultJson>('project retrieve start -x package.xml --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result;
      expect(retrieveResults?.files).to.have.length(2);
    });
  });

  describe('metadata', () => {
    describe('deploy', () => {
      it('can deploy all metadata items', async () => {
        execCmd('project deploy start -m CustomFieldTranslation -m CustomObjectTranslation --json', {
          ensureExitCode: 0,
        });
      });
    });

    describe('retrieve', () => {
      it('can retrieve all metadata items', async () => {
        execCmd('project retrieve start -m CustomFieldTranslation -m CustomObjectTranslation --json', {
          ensureExitCode: 0,
        });
      });
    });
  });

  describe('sourcepath', () => {
    describe('deploy', () => {
      it('can deploy the whole project', async () => {
        execCmd('project deploy start -d force-app --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type deploys', () => {
        it('can deploy COT', async () => {
          execCmd(`project deploy start -d ${translationPath} --json`, {
            ensureExitCode: 0,
          });
        });

        it('can deploy CFTs', async () => {
          const result = execCmd<DeployResultJson>(
            `project deploy start -d ${path.join(translationPath, 'customField__c.fieldTranslation-meta.xml')} --json`,
            {
              ensureExitCode: 0,
            }
          );
          expect(result.jsonOutput?.result.files.some((d) => d.type === 'CustomObjectTranslation')).to.be.true;
        });

        it('can deploy COT', async () => {
          execCmd(
            `project deploy start -d ${path.join(translationPath, 'customField__c.fieldTranslation-meta.xml')} --json`,
            {
              ensureExitCode: 0,
            }
          );
        });
      });
    });

    describe('retrieve', () => {
      it('can retrieve the whole project', async () => {
        execCmd('project retrieve start -d force-app --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type retrieves', () => {
        it('can retrieve COT', async () => {
          execCmd(`project retrieve start -d ${translationPath} --json`, {
            ensureExitCode: 0,
          });
        });

        it('can retrieve COT from directory', async () => {
          execCmd(
            `project retrieve start -d ${path.join(
              translationPath,
              'customObject__c-es.objectTranslation-meta.xml'
            )} --json`,
            {
              ensureExitCode: 0,
            }
          );
        });
      });
    });
  });
  describe('MPD', () => {
    describe('deploy', () => {
      it('can deploy the whole project', async () => {
        execCmd('project deploy start -d force-app -d my-app --json', {
          ensureExitCode: 0,
        });
      });
    });

    describe('retrieve', () => {
      it('can retrieve the whole project', async () => {
        execCmd('project retrieve start -d force-app -d my-app --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type retrieves', () => {
        before(() => {
          fs.unlinkSync(fieldTranslationPath);
        });
        it('will write the CFT with the COT, even when not in the default package', async () => {
          execCmd(`project retrieve start -d ${translationPath} --json`, {
            ensureExitCode: 0,
          });
          expect(fs.existsSync(fieldTranslationPath)).to.be.true;
        });
      });
    });
  });

  describe('mdapi format', () => {
    it('can convert COT/CFTs correctly', () => {
      execCmd('force:source:convert --outputdir mdapi', { ensureExitCode: 0 });
      // the CFTs shouldn't be written to mdapi format
      expect(fs.existsSync(path.join(session.project.dir, 'mdapi', 'fields'))).to.be.false;
      expect(fs.existsSync(path.join(session.project.dir, 'mdapi', 'objectTranslations'))).to.be.true;
    });
  });
});
