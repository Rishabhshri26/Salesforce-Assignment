import { test, expect } from '../fixtures/test-fixtures';
import {
  createAccount,
  findOpportunitiesByName,
  getOpportunity,
} from '../api/record-api';
import { OpportunityPage } from '../pages/opportunity-page';
import { uniqueValue } from '../utils/test-data';
import { getSalesforceOrgDetails } from '../utils/salesforce-cli';

test('creates and progresses an opportunity', async ({
  page,
  salesforceClient,
  createdRecords,
}) => {
  test.setTimeout(60000);

  const accountName = uniqueValue('PW-Opportunity-Account');
  const opportunityName = uniqueValue('PW-Opportunity');
  const amount = 75000;

const closeDate = new Date();
closeDate.setDate(closeDate.getDate() + 90);

const closeDateValue = [
  String(closeDate.getMonth() + 1).padStart(2, '0'),
  String(closeDate.getDate()).padStart(2, '0'),
  closeDate.getFullYear(),
].join('/');

  console.log('[3.3] Creating Account');

  const account = await createAccount(
    salesforceClient,
    accountName
  );

  createdRecords.add('Account', account.Id);

  console.log(`[3.3] Account created: ${account.Id}`);

  const { instanceUrl } = await getSalesforceOrgDetails();

  console.log('[3.3] Opening Account UI');

  await page.goto(
    `${instanceUrl}/lightning/r/Account/${account.Id}/view`,
    { waitUntil: 'commit' }
  );

  console.log('[3.3] Account UI opened');

  const opportunityPage = new OpportunityPage(page);

  console.log('[3.3] Creating Opportunity through UI');

  await opportunityPage.createOpportunity(
    opportunityName,
    amount,
    closeDateValue,
    'Qualification'
  );

  console.log('[3.3] Opportunity UI creation completed');

  console.log('[3.3] Waiting for Opportunity API persistence');

    const apiCloseDateValue = [
    closeDate.getFullYear(),
    String(closeDate.getMonth() + 1).padStart(2, '0'),
    String(closeDate.getDate()).padStart(2, '0'),
    ].join('-');

  await expect.poll(
    async () => {
      const opportunities = await findOpportunitiesByName(
        salesforceClient,
        opportunityName
      );

      return opportunities.length;
    },
    {
      message: 'Opportunity should be created',
      timeout: 15000,
      intervals: [500, 1000, 2000],
    }
  ).toBe(1);

  console.log('[3.3] Opportunity persisted in Salesforce');

  const opportunities = await findOpportunitiesByName(
    salesforceClient,
    opportunityName
  );

  expect(opportunities).toHaveLength(1);

  const opportunity = opportunities[0];

  expect(opportunity.AccountId).toBe(account.Id);
  expect(opportunity.Amount).toBe(amount);
  expect(opportunity.StageName).toBe('Qualification');
  expect(opportunity.CloseDate).toBe(apiCloseDateValue);

  const opportunityId = opportunity.Id;

  createdRecords.add('Opportunity', opportunityId);

  console.log(`[3.3] Opportunity created: ${opportunityId}`);

  console.log('[3.3] Opening Opportunity');

  await page.goto(
    `${instanceUrl}/lightning/r/Opportunity/${opportunityId}/view`,
    { waitUntil: 'commit' }
  );

  console.log('[3.3] Opportunity opened');

  console.log('[3.3] Advancing to Needs Analysis');

  await opportunityPage.advanceToStage('Needs Analysis');

  console.log('[3.3] Reached Needs Analysis');

  console.log('[3.3] Advancing to Value Proposition');

  await opportunityPage.advanceToStage('Value Proposition');

  console.log('[3.3] Reached Value Proposition');

  console.log('[3.3] Verifying final Opportunity state through API');

  await expect.poll(
    async () => {
      const currentOpportunity = await getOpportunity(
        salesforceClient,
        opportunityId
      );

      return {
        StageName: currentOpportunity.StageName,
        Amount: currentOpportunity.Amount,
        CloseDate: currentOpportunity.CloseDate,
        AccountId: currentOpportunity.AccountId,
      };
    },
    {
      message: 'Opportunity should persist its final values',
      timeout: 15000,
      intervals: [500, 1000, 2000],
    }
  ).toEqual({
    StageName: 'Value Proposition',
    Amount: amount,
    CloseDate: apiCloseDateValue,
    AccountId: account.Id,
  });

  console.log('[3.3] Final Opportunity state verified');
});