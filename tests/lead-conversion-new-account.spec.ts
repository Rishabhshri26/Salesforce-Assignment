import { test, expect } from '../fixtures/test-fixtures';
import { createLead, getLead } from '../api/lead-api';
import {
  getAccount,
  getContact,
  getOpportunity,
} from '../api/record-api';
import { LeadPage } from '../pages/lead-page';
import { createLeadTestData } from '../utils/test-data';
import { getSalesforceOrgDetails } from '../utils/salesforce-cli';

test('converts a lead into a new account', async ({
  page,
  salesforceClient,
  createdRecords,
}) => {
    test.setTimeout(60000);
    
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

  const leadPage = new LeadPage(page);

  await leadPage.openActionsMenu();
  await leadPage.openConversionModal();
  await leadPage.assertNewRecordOptionsSelected();
  await leadPage.confirmConversion();

  /*
   * Salesforce commits conversion asynchronously.
   * Poll the platform state instead of using an arbitrary wait.
   */
  await expect
    .poll(
      async () => {
        const convertedLead = await getLead(
          salesforceClient,
          lead.id
        );

        return {
          isConverted: convertedLead.IsConverted,
          accountId: convertedLead.ConvertedAccountId,
          contactId: convertedLead.ConvertedContactId,
          opportunityId: convertedLead.ConvertedOpportunityId,
        };
      },
      {
        message: 'Lead conversion should be persisted by Salesforce',
        timeout: 15000,
        intervals: [500, 1000, 2000],
      }
    )
    .toEqual({
      isConverted: true,
      accountId: expect.any(String),
      contactId: expect.any(String),
      opportunityId: expect.any(String),
    });

  const convertedLead = await getLead(
    salesforceClient,
    lead.id
  );

  expect(convertedLead.IsConverted).toBe(true);
  expect(convertedLead.ConvertedAccountId).toBeTruthy();
  expect(convertedLead.ConvertedContactId).toBeTruthy();
  expect(convertedLead.ConvertedOpportunityId).toBeTruthy();

  const account = await getAccount(
    salesforceClient,
    convertedLead.ConvertedAccountId!
  );

  const contact = await getContact(
    salesforceClient,
    convertedLead.ConvertedContactId!
  );

  const opportunity = await getOpportunity(
    salesforceClient,
    convertedLead.ConvertedOpportunityId!
  );

  expect(account.Name).toBe(data.company);

  expect(contact.FirstName).toBe(data.firstName);
  expect(contact.LastName).toBe(data.lastName);
  expect(contact.Email).toBe(data.email);
  expect(contact.AccountId).toBe(account.Id);

  expect(opportunity.AccountId).toBe(account.Id);
  expect(opportunity.Name).toContain(data.company);
});