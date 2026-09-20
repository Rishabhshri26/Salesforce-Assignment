import { test as base, type TestInfo } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  type SalesforceOrgAuth,
} from '../utils/salesforce-cli';
import { SalesforceClient } from '../api/salesforce-client';
import { getLead } from '../api/lead-api';

type CreatedRecord = {
  objectName: string;
  recordId: string;
};

type Fixtures = {
  salesforceAuth: SalesforceOrgAuth;
  createdRecords: {
    add: (objectName: string, recordId: string) => void;
  };
};

type WorkerFixtures = {
  salesforceClient: SalesforceClient;
};

const cleanupPriority: Record<string, number> = {
  Opportunity: 1,
  Contact: 2,
  Lead: 3,
  Account: 4,
};

async function readSalesforceAuth(): Promise<SalesforceOrgAuth> {
  const authFile = path.resolve(
    'playwright/.auth/salesforce-auth.json'
  );

  const content = await fs.readFile(authFile, 'utf-8');

  return JSON.parse(content) as SalesforceOrgAuth;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  /*
   * One Salesforce API client per Playwright worker.
   *
   * SalesforceClient owns an API request context, so keeping one client
   * per worker avoids repeatedly creating request contexts while keeping
   * workers isolated from one another.
   */
  salesforceClient: [
    async ({}, use) => {
      const auth = await readSalesforceAuth();
      const client = await SalesforceClient.create(auth);

      await use(client);

      await client.close();
    },
    {
      scope: 'worker',
      timeout: 60000,
    },
  ],

  salesforceAuth: async ({}, use) => {
    await use(await readSalesforceAuth());
  },

  /*
   * Tracks every record created by an individual test and removes it
   * during teardown, whether the test passes or fails.
   *
   * Converted Leads cannot be reverted, but Salesforce permits them to
   * be deleted through the public API. We therefore resolve the records
   * produced by conversion before cleanup and then delete all records in
   * dependency order.
   */
  createdRecords: async (
    { salesforceClient },
    use,
    testInfo: TestInfo
  ) => {
    const records: CreatedRecord[] = [];

    const add = (
      objectName: string,
      recordId: string
    ): void => {
      const alreadyTracked = records.some(
        (record) =>
          record.objectName === objectName &&
          record.recordId === recordId
      );

      if (!alreadyTracked) {
        records.push({
          objectName,
          recordId,
        });
      }
    };

    await use({ add });

    const cleanupErrors: string[] = [];

    /*
     * Resolve conversion-generated records before deleting anything.
     * Converted Lead IDs hold the Account, Contact and Opportunity IDs.
     */
    for (const record of records) {
      if (record.objectName !== 'Lead') {
        continue;
      }

      try {
        const lead = await getLead(
          salesforceClient,
          record.recordId
        );

        if (lead.IsConverted) {
          if (lead.ConvertedOpportunityId) {
            add(
              'Opportunity',
              lead.ConvertedOpportunityId
            );
          }

          if (lead.ConvertedContactId) {
            add(
              'Contact',
              lead.ConvertedContactId
            );
          }

          if (lead.ConvertedAccountId) {
            add(
              'Account',
              lead.ConvertedAccountId
            );
          }
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error while resolving converted Lead records.';

        cleanupErrors.push(
          `Lead cleanup discovery failed for ${record.recordId}: ${message}`
        );
      }
    }

    /*
     * Delete child/dependent records first.
     *
     * Opportunity and Contact are deleted before the Lead.
     * The Lead is then deleted before the Account so the converted
     * Lead relationship does not prevent Account cleanup.
     */
    const uniqueCleanupRecords = records
      .filter(
        (record, index, allRecords) =>
          index ===
          allRecords.findIndex(
            (candidate) =>
              candidate.objectName === record.objectName &&
              candidate.recordId === record.recordId
          )
      )
      .sort((a, b) => {
        const priorityA =
          cleanupPriority[a.objectName] ?? 10;
        const priorityB =
          cleanupPriority[b.objectName] ?? 10;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return a.recordId.localeCompare(b.recordId);
      });

    for (const record of uniqueCleanupRecords) {
      try {
        await salesforceClient.delete(
          record.objectName,
          record.recordId
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown cleanup error.';

        cleanupErrors.push(
          `${record.objectName}/${record.recordId}: ${message}`
        );
      }
    }

    if (cleanupErrors.length > 0) {
      await testInfo.attach('cleanup-errors', {
        body: cleanupErrors.join('\n'),
        contentType: 'text/plain',
      });

      throw new Error(
        `Test cleanup failed:\n${cleanupErrors.join('\n')}`
      );
    }
  },
});

export { expect } from '@playwright/test';