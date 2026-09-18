import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getSalesforceOrgAuth } from '../utils/salesforce-cli';

const authFile = path.resolve('playwright/.auth/user.json');

setup('authenticate Salesforce session', async ({ browser }) => {
  console.log('[AUTH] Starting authentication setup');

  const { instanceUrl, accessToken } = await getSalesforceOrgAuth();

  console.log('[AUTH] Salesforce CLI authentication retrieved');

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

    /*
     * A successful Front Door authentication establishes the Salesforce
     * browser session. The API request context and browser context share
     * their cookie jar, so those session cookies can be persisted directly
     * as Playwright storageState.
     */
    expect(
      response.ok(),
      `Salesforce Front Door authentication failed with HTTP ${response.status()}`
    ).toBeTruthy();

    await fs.mkdir(path.dirname(authFile), { recursive: true });

    await context.storageState({
      path: authFile,
    });

    console.log(`[AUTH] storageState saved to ${authFile}`);
  } finally {
    await context.close();

    console.log('[AUTH] Browser context closed');
  }
});