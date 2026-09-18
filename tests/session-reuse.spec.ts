import { test, expect } from '@playwright/test';
import { getSalesforceOrgDetails } from '../utils/salesforce-cli';

test('reuses the authenticated Salesforce session', async ({ page }) => {
  const { instanceUrl } = await getSalesforceOrgDetails();

  const response = await page.goto(
    `${instanceUrl}/lightning/page/home`,
    {
      waitUntil: 'commit',
    }
  );

  expect(response, 'Salesforce page did not return a response').not.toBeNull();
  expect(response?.ok()).toBeTruthy();

  await expect(page).toHaveURL(/\/lightning\//);
});