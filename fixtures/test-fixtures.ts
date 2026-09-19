import { test as base, type TestInfo } from '@playwright/test';

import {
  getSalesforceOrgAuth,
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
  Account: 3,
  Lead: 4,
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  /*
   * One Salesforce API client per Playwright worker.
   *
   * The client is stateless from the test perspective, so a worker-scoped
   * instance avoids repeatedly creating API request contexts while keeping
   * workers independent.
   */
  salesforceClient: [
  async ({}, use) => {
    const auth = await getSalesforceOrgAuth();
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
    await use(await getSalesforceOrgAuth());
  },

  /*
   * Tracks records created by an individual test.
   *
   * Converted Leads are irreversible. During teardown we therefore resolve
   * their generated Account, Contact and Opportunity IDs and clean up those
   * records, while deliberately leaving the converted Lead itself in place.
   */
  createdRecords: async ({ salesforceClient }, use, testInfo: TestInfo) => {
    const records: CreatedRecord[] = [];

    const add = (objectName: string, recordId: string): void => {
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

    const cleanupRecords = [...records];
    const convertedLeadIds = new Set<string>();
    const cleanupErrors: string[] = [];

    /*
     * A successful Lead conversion creates Account, Contact and Opportunity
     * records whose IDs are stored on the Lead. Resolve those IDs before
     * cleanup so they are still available even if the test failed immediately
     * after conversion.
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
          convertedLeadIds.add(record.recordId);

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
     * Rebuild the list after discovering conversion-generated records.
     */
    cleanupRecords.length = 0;
    cleanupRecords.push(...records);

    /*
     * Delete dependent records before their parent Account.
     * Converted Leads are intentionally excluded because Salesforce does
     * not allow a converted Lead to be reverted/deleted.
     */
    cleanupRecords.sort((a, b) => {
      const priorityA = cleanupPriority[a.objectName] ?? 10;
      const priorityB = cleanupPriority[b.objectName] ?? 10;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return 0;
    });

    /*
     * Remove duplicates after conversion discovery.
     */
    const uniqueCleanupRecords = cleanupRecords.filter(
      (record, index, allRecords) =>
        index ===
        allRecords.findIndex(
          (candidate) =>
            candidate.objectName === record.objectName &&
            candidate.recordId === record.recordId
        )
    );

    for (const record of uniqueCleanupRecords) {
      if (
        record.objectName === 'Lead' &&
        convertedLeadIds.has(record.recordId)
      ) {
        continue;
      }

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