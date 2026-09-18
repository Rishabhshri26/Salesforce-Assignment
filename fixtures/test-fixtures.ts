import { test as base, type TestInfo } from '@playwright/test';

import {
  getSalesforceOrgAuth,
  type SalesforceOrgAuth,
} from '../utils/salesforce-cli';
import { SalesforceClient } from '../api/salesforce-client';

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

export const test = base.extend<Fixtures, WorkerFixtures>({
  /*
   * One Salesforce API client per Playwright worker.
   *
   * The client is stateless from the test perspective, so creating one
   * per worker avoids repeatedly creating API request contexts while
   * still keeping workers independent.
   */
  salesforceClient: [
    async ({}, use) => {
      const auth = await getSalesforceOrgAuth();
      const client = await SalesforceClient.create(auth);

      await use(client);

      await client.close();
    },
    { scope: 'worker' },
  ],

  salesforceAuth: async ({}, use) => {
    await use(await getSalesforceOrgAuth());
  },

  /*
   * Test-scoped record tracker.
   * Every test registers records it creates, and teardown deletes them
   * in reverse creation order so dependent Salesforce records are removed
   * before their parents.
   */
  createdRecords: async ({ salesforceClient }, use, testInfo: TestInfo) => {
    const records: CreatedRecord[] = [];

    const add = (objectName: string, recordId: string): void => {
      records.push({
        objectName,
        recordId,
      });
    };

    await use({ add });

    const cleanupErrors: string[] = [];

    for (const record of [...records].reverse()) {
      try {
        await salesforceClient.delete(
          record.objectName,
          record.recordId
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown cleanup error';

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