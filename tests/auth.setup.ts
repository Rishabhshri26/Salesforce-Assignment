import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSalesforceOrgAuth } from '../utils/salesforce-cli';

const authFile = path.resolve('playwright/.auth/user.json');
const authDataFile = path.resolve('playwright/.auth/salesforce-auth.json');

setup('authenticate Salesforce session', async ({ browser }) => {
  setup.setTimeout(120000);
  console.log('[AUTH] Starting authentication setup');

  const auth = await getSalesforceOrgAuth();

  await fs.mkdir(path.dirname(authDataFile), { recursive: true });
  await fs.writeFile(
    authDataFile,
    JSON.stringify(auth, null, 2),
    'utf-8'
  );

  console.log('[AUTH] Salesforce CLI authentication retrieved');

  const { instanceUrl, accessToken } = auth;

  const context = await browser.newContext({
    storageState: undefined,
  });

  try {
    console.log('[AUTH] Sending frontdoor authentication request');

    const response = await context.request.post(
      `${instanceUrl}/secur/frontdoor.jsp`,
      {
        form: {
          sid: accessToken,
          retURL: '/lightning/page/home',
        },
        maxRedirects: 0,
        failOnStatusCode: false,
      }
    );

    console.log(
      `[AUTH] Frontdoor response received: HTTP ${response.status()}`
    );

    expect(
      response.ok(),
      `Salesforce Front Door authentication failed with HTTP ${response.status()}`
    ).toBeTruthy();

    await fs.mkdir(path.dirname(authFile), { recursive: true });
    await context.storageState({ path: authFile });

    console.log(`[AUTH] storageState saved to ${authFile}`);
  } finally {
    await context.close();
    console.log('[AUTH] Browser context closed');
  }
});