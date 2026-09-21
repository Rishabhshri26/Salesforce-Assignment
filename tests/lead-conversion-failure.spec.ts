import { test, expect } from '../fixtures/test-fixtures';
import {
  createAccount,
  findOpportunitiesByName,
} from '../api/record-api';
import { getSalesforceOrgDetails } from '../utils/salesforce-cli';
import { uniqueValue } from '../utils/test-data';

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

  await page
    .getByRole('article', { name: 'Opportunities' })
    .getByRole('button', { name: 'New' })
    .click();

  await page
    .getByRole('textbox', { name: 'Opportunity Name' })
    .fill(opportunityName);

  await page
    .getByRole('spinbutton', { name: 'Amount' })
    .fill('75000');

  await page
    .getByRole('textbox', { name: 'Close Date' })
    .fill('12/31/2026');

  const stageField = page.getByRole('combobox', {
    name: 'Stage',
  });

  await expect(stageField).toBeVisible({
    timeout: 10000,
  });

  await stageField.click();

  const stageListbox = page.locator(
    '[role="listbox"]:visible'
  );

  await expect(stageListbox).toHaveCount(1, {
    timeout: 10000,
  });

  const stageOption = stageListbox.getByRole('option', {
    name: 'Qualification',
    exact: true,
  });

  await expect(stageOption).toBeVisible({
    timeout: 10000,
  });

  /*
   * Salesforce Lightning exposes the committed picklist value
   * through the data-value attribute on the combobox button.
   */
  await stageOption.click();

  await expect(stageField).toHaveAttribute(
    'data-value',
    'Qualification',
    {
      timeout: 10000,
    }
  );

  await stageField.press('Tab');

  await page
    .getByRole('button', { name: 'Save', exact: true })
    .click();

  /*
   * The validation rule should block the Opportunity creation
   * and expose the configured Salesforce error in the UI.
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
   * Verify through the Salesforce API that the failed creation
   * did not persist an Opportunity.
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