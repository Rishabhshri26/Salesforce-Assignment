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
    await this.page
  .getByRole('button', { name: 'Convert', exact: true })
  .last()
  .click();

  await expect(
    this.page.getByRole('heading', {
      name: 'Your lead has been converted',
      exact: true,
    })
  ).toBeVisible({ timeout: 30000 });

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

  const accountOption = this.page.getByRole('option', {
    name: new RegExp(`^${accountName.slice(0, 20)}`),
  });

  await expect(accountOption).toBeVisible({ timeout: 10000 });
  await accountOption.click();

  // The autocomplete option must disappear after the Account is selected.
  await expect(accountOption).toBeHidden({ timeout: 10000 });
}
}