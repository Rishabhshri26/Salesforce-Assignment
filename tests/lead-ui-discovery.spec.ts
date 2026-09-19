import { test } from '../fixtures/test-fixtures';
import { createLead } from '../api/lead-api';
import { createLeadTestData } from '../utils/test-data';
import { getSalesforceOrgDetails } from '../utils/salesforce-cli';

test('inspect Lead conversion UI', async ({
  page,
  salesforceClient,
  createdRecords,
}) => {
  const data = createLeadTestData();

  const lead = await createLead(
    salesforceClient,
    data
  );

  createdRecords.add('Lead', lead.id);

  const { instanceUrl } = await getSalesforceOrgDetails();

  await page.goto(
    `${instanceUrl}/lightning/r/Lead/${lead.id}/view`,
    {
      waitUntil: 'commit',
    }
  );

  await page.pause();
});