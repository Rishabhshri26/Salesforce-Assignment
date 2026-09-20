import { test, expect } from '../fixtures/test-fixtures';
import { createLead, getLead } from '../api/lead-api';
import {
  createAccount,
  findAccountsByName,
  getAccount,
  getContact,
  getOpportunity,
} from '../api/record-api';
import { LeadPage } from '../pages/lead-page';
import { createLeadTestData, uniqueValue } from '../utils/test-data';
import { getSalesforceOrgDetails } from '../utils/salesforce-cli';

test('converts a lead into an existing account', async ({
  page,
  salesforceClient,
  createdRecords,
}) => {
  test.setTimeout(60000);

  const accountName = uniqueValue('PW-Existing-Account');

  const account = await createAccount(salesforceClient, accountName);

  createdRecords.add('Account', account.Id);

  const leadData = createLeadTestData();
  const lead = await createLead(salesforceClient, leadData);
  createdRecords.add('Lead', lead.id);

  const { instanceUrl } = await getSalesforceOrgDetails();

  await page.goto(
    `${instanceUrl}/lightning/r/Lead/${lead.id}/view`,
    { waitUntil: 'commit' }
  );

  const leadPage = new LeadPage(page);

  await leadPage.openActionsMenu();
  await leadPage.openConversionModal();
  await leadPage.chooseExistingAccount(accountName);
  await leadPage.confirmConversion();

  await expect.poll(
    async () => {
      const convertedLead = await getLead(salesforceClient, lead.id);

      return {
        isConverted: convertedLead.IsConverted,
        accountId: convertedLead.ConvertedAccountId,
      };
    },
    {
      message: 'Lead should be converted to the existing Account',
      timeout: 15000,
      intervals: [500, 1000, 2000],
    }
  ).toEqual({
    isConverted: true,
    accountId: account.Id,
  });

  const accounts = await findAccountsByName(
    salesforceClient,
    accountName
  );

  expect(accounts).toHaveLength(1);
  expect(accounts[0].Id).toBe(account.Id);

  const convertedLead = await getLead(salesforceClient, lead.id);

  expect(convertedLead.ConvertedAccountId).toBe(account.Id);
  expect(convertedLead.ConvertedContactId).toBeTruthy();
  expect(convertedLead.ConvertedOpportunityId).toBeTruthy();

  const contact = await getContact(
    salesforceClient,
    convertedLead.ConvertedContactId!
  );

  const opportunity = await getOpportunity(
    salesforceClient,
    convertedLead.ConvertedOpportunityId!
  );

  expect(contact.AccountId).toBe(account.Id);
  expect(opportunity.AccountId).toBe(account.Id);
});