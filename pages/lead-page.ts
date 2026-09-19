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
}