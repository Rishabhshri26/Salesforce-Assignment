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

    await expect(stageField).toBeVisible({
      timeout: 10000,
    });

    await stageField.click();

    const stageListbox = this.page.locator(
      '[role="listbox"]:visible'
    );

    await expect(stageListbox).toHaveCount(1, {
      timeout: 10000,
    });

    const stageOption = stageListbox.getByRole('option', {
      name: stage,
      exact: true,
    });

    await expect(stageOption).toBeVisible({
      timeout: 10000,
    });

    await stageOption.click();

    /*
     * Salesforce Lightning exposes the committed picklist value
     * through the data-value attribute on the combobox button.
     */
    await expect(stageField).toHaveAttribute(
      'data-value',
      stage,
      {
        timeout: 10000,
      }
    );

    await stageField.press('Tab');

    await this.page
      .getByRole('button', { name: 'Save', exact: true })
      .click();
  }

  async advanceToStage(stage: string): Promise<void> {
    /*
     * Salesforce Path behavior:
     *
     * - Selecting a future stage focuses that stage and shows
     *   "Mark as Current Stage".
     * - Selecting the current stage shows
     *   "Mark Stage as Complete".
     *
     * The helper therefore detects which action Salesforce
     * actually exposes rather than assuming one button label.
     */
    const stageLink = this.page
      .locator('a')
      .filter({ hasText: stage })
      .first();

    await expect(stageLink).toBeVisible({
      timeout: 10000,
    });

    await stageLink.click();

    const markCurrentStageButton = this.page.getByRole('button', {
      name: 'Mark as Current Stage',
      exact: true,
    });

    const markStageCompleteButton = this.page.getByRole('button', {
      name: 'Mark Stage as Complete',
      exact: true,
    });

    await expect
      .poll(
        async () => {
          if (await markCurrentStageButton.isVisible()) {
            return 'current';
          }

          if (await markStageCompleteButton.isVisible()) {
            return 'complete';
          }

          return 'none';
        },
        {
          message: `Salesforce should expose a stage action after selecting "${stage}"`,
          timeout: 10000,
          intervals: [250, 500, 1000],
        }
      )
      .not.toBe('none');

    if (await markCurrentStageButton.isVisible()) {
      await markCurrentStageButton.click();
    } else {
      await markStageCompleteButton.click();
    }
  }
}