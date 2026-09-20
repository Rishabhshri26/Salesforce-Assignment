import { expect, type Page } from '@playwright/test';

export class LeadPage {
  constructor(private readonly page: Page) {}

  async openActionsMenu(): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Show more actions' })
      .click();
  }

  async openConversionModal(): Promise<void> {
    await this.page
      .getByRole('menuitem', { name: 'Convert', exact: true })
      .click();

    await expect(
      this.page.getByRole('heading', { name: 'Convert Lead' })
    ).toBeVisible();
  }

  async assertNewRecordOptionsSelected(): Promise<void> {
    await expect(
      this.page.getByText('Create New Account', { exact: true })
    ).toBeVisible();

    await expect(
      this.page.getByText('Create New Contact', { exact: true })
    ).toBeVisible();

    await expect(
      this.page.getByText('Create New Opportunity', { exact: true })
    ).toBeVisible();
  }

async confirmConversion(): Promise<void> {
  const convertButtons = this.page.getByRole('button', {
    name: 'Convert',
    exact: true,
  });

  await expect.poll(
    async () => {
      const count = await convertButtons.count();

      for (let index = 0; index < count; index++) {
        const button = convertButtons.nth(index);

        if (
          await button.isVisible() &&
          await button.isEnabled()
        ) {
          return index;
        }
      }

      return -1;
    },
    {
      message: 'A visible and enabled Convert button should be available',
      timeout: 15000,
      intervals: [500, 1000, 2000],
    }
  ).toBeGreaterThanOrEqual(0);

  const count = await convertButtons.count();

  for (let index = 0; index < count; index++) {
    const button = convertButtons.nth(index);

    if (
      await button.isVisible() &&
      await button.isEnabled()
    ) {
      await button.click();
      break;
    }
  }

  await expect(
    this.page.getByRole('heading', {
      name: 'Your lead has been converted',
      exact: true,
    })
  ).toBeVisible({
    timeout: 30000,
  });

  await expect(
    this.page.getByRole('heading', {
      name: 'Account',
      exact: true,
    })
  ).toBeVisible();

  await expect(
    this.page.getByRole('heading', {
      name: 'Contact',
      exact: true,
    })
  ).toBeVisible();

  await expect(
    this.page.getByRole('heading', {
      name: 'Opportunity',
      exact: true,
    })
  ).toBeVisible();
}

async chooseExistingAccount(accountName: string): Promise<void> {
  await this.page
    .locator('label')
    .filter({ hasText: 'Choose Existing Account' })
    .click();

  const accountSearch = this.page.getByRole('combobox', {
    name: 'Account Search',
  });

  await accountSearch.fill(accountName);

  // Salesforce first shows an autocomplete option.
  const searchOption = this.page
    .getByRole('option')
    .filter({
      hasText: accountName.slice(0, 20),
    })
    .first();

  await expect.poll(
    async () => searchOption.count(),
    {
      message: 'Existing Account should appear in Account Search results',
      timeout: 15000,
      intervals: [500, 1000, 2000],
    }
  ).toBeGreaterThan(0);

  await expect(searchOption).toBeVisible({
    timeout: 5000,
  });

  await searchOption.click();

  // Salesforce opens an Account Results dialog after the search result.
  await expect(
    this.page.getByRole('heading', {
      name: 'Account Results',
      exact: true,
    })
  ).toBeVisible({
    timeout: 10000,
  });

  // Select the matching Account from the results table.
  const accountResult = this.page
    .getByRole('link')
    .filter({
      hasText: accountName.slice(0, 20),
    })
    .first();

  await expect(accountResult).toBeVisible({
    timeout: 10000,
  });

  await accountResult.click();

  // The Account Results dialog should close after selection.
  await expect(
    this.page.getByRole('heading', {
      name: 'Account Results',
      exact: true,
    })
  ).toBeHidden({
    timeout: 10000,
  });
}
}