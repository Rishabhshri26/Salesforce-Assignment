import { test, expect } from '../fixtures/test-fixtures';
import {
  createAccount,
  findOpportunitiesByName,
} from '../api/record-api';
import { getSalesforceOrgDetails } from '../utils/salesforce-cli';
import { uniqueValue } from '../utils/test-data';
import { OpportunityPage } from '../pages/opportunity-page';

test('blocks Opportunity creation under the validation rule', async ({
  page,
  salesforceClient,
  createdRecords,
}) => {
  test.setTimeout(90000);

  const accountName = uniqueValue('PW-3.4-Account');
  const opportunityName = uniqueValue('PW-FAIL-Opportunity');

  const account = await createAccount(
    salesforceClient,
    accountName
  );

  createdRecords.add('Account', account.Id);

  const { instanceUrl } = await getSalesforceOrgDetails();

  await page.goto(
    `${instanceUrl}/lightning/r/Account/${account.Id}/view`,
    {
      waitUntil: 'commit',
    }
  );

  const opportunityPage = new OpportunityPage(page);

  /*
   * Reuse the same Salesforce Opportunity creation interaction as
   * the positive Opportunity scenario, including the resilient
   * Stage selection.
   */
  await opportunityPage.createOpportunity(
    opportunityName,
    75000,
    '12/31/2026',
    'Qualification'
  );

  /*
   * The save must be blocked by the validation rule. The expected
   * Salesforce error must be visible to the user.
   */
  await expect(
    page.getByText(
      'Playwright failure condition: Opportunity creation is blocked.',
      {
        exact: true,
      }
    )
  ).toBeVisible({
    timeout: 15000,
  });

  /*
   * Prove through the Salesforce API that no Opportunity was
   * persisted despite the attempted UI save.
   */
  await expect
    .poll(
      async () => {
        const opportunities = await findOpportunitiesByName(
          salesforceClient,
          opportunityName
        );

        return opportunities.length;
      },
      {
        message:
          'Blocked Opportunity must not be persisted in Salesforce',
        timeout: 15000,
        intervals: [500, 1000, 2000],
      }
    )
    .toBe(0);
});