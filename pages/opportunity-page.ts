import { expect, type Page } from '@playwright/test';

export class OpportunityPage {
  constructor(private readonly page: Page) {}

  async createOpportunity(
    name: string,
    amount: number,
    closeDate: string,
    stage: string
  ): Promise<void> {
    await this.page
      .getByRole('article', { name: 'Opportunities' })
      .getByRole('button', { name: 'New' })
      .click();

    await this.page
      .getByRole('textbox', { name: 'Opportunity Name' })
      .fill(name);

    await this.page
      .getByRole('spinbutton', { name: 'Amount' })
      .fill(String(amount));

    await this.page
      .getByRole('textbox', { name: 'Close Date' })
      .fill(closeDate);

    const stageField = this.page.getByRole('combobox', {
      name: 'Stage',
    });

    await stageField.click();

    await expect(
      this.page.getByText(stage, { exact: true })
    ).toBeVisible({ timeout: 5000 });

    await this.page
      .getByText(stage, { exact: true })
      .click();

    await this.page
      .getByRole('button', { name: 'Save', exact: true })
      .click();
  }

async advanceToStage(stage: string): Promise<void> {
  const stageLink = this.page
    .locator('a')
    .filter({ hasText: stage });

  await expect(stageLink).toBeVisible({
    timeout: 10000,
  });

  await stageLink.click();

  const markCurrentStageButton = this.page.getByRole('button', {
    name: 'Mark as Current Stage',
    exact: true,
  });

  await expect(markCurrentStageButton).toBeVisible({
    timeout: 10000,
  });

  await markCurrentStageButton.click();

  // After promotion, Salesforce changes the action to
  // "Mark Stage as Complete" for the new current stage.
  await expect(
    this.page.getByRole('button', {
      name: 'Mark Stage as Complete',
      exact: true,
    })
  ).toBeVisible({
    timeout: 10000,
  });
}
}