import { test, expect } from '../fixtures/test-fixtures';
import { createAccount } from '../api/record-api';
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

  // Arrange: create the Account through the API.
  const account = await createAccount(
    salesforceClient,
    accountName
  );

  createdRecords.add('Account', account.Id);

  const { instanceUrl } = await getSalesforceOrgDetails();

  // Open the Account in Salesforce UI.
  await page.goto(
    `${instanceUrl}/lightning/r/Account/${account.Id}/view`,
    { waitUntil: 'commit' }
  );

  // Open New Opportunity from the Opportunities related list.
  await page
    .getByRole('article', { name: 'Opportunities' })
    .getByRole('button', { name: 'New' })
    .click();

  // Fill the Opportunity creation form.
  await page
    .getByRole('textbox', {
      name: 'Opportunity Name',
    })
    .fill(opportunityName);

  await page
    .getByRole('spinbutton', {
      name: 'Amount',
    })
    .fill('75000');

  await page
    .getByRole('textbox', {
      name: 'Close Date',
    })
    .fill('12/31/2026');

  const stageField = page.getByRole('combobox', {
  name: 'Stage',
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

await stageOption.click();

  // Trigger the validation rule.
  await page
    .getByRole('button', {
      name: 'Save',
      exact: true,
    })
    .click();

  // The Opportunity validation rule must be surfaced to the user.
  await expect(
    page.getByText(
      'Playwright failure condition: Opportunity creation is blocked.',
      { exact: true }
    )
  ).toBeVisible({
    timeout: 15000,
  });

  // Confirm through the API that the Opportunity was not created.
  await expect.poll(
    async () => {
      const result = await salesforceClient.query<{ Id: string }>(
        `SELECT Id
         FROM Opportunity
         WHERE Name = '${opportunityName}'
         LIMIT 1`
      );

      return result.records.length;
    },
    {
      message:
        'Blocked Opportunity must not be persisted in Salesforce',
      timeout: 15000,
      intervals: [500, 1000, 2000],
    }
  ).toBe(0);
});