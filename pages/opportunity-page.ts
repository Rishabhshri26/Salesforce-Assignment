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

    /*
     * Salesforce Lightning renders the modal footer asynchronously.
     * The form can reflow when the footer appears, which can close an
     * already-open picklist. Wait for the footer to finish rendering
     * before interacting with the Stage control.
     */
    const saveButton = this.page.getByRole('button', {
      name: 'Save',
      exact: true,
    });

    const cancelButton = this.page.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });

    const saveAndNewButton = this.page.getByRole('button', {
      name: 'Save & New',
      exact: true,
    });

    await expect(saveButton).toBeVisible({
      timeout: 15000,
    });

    await expect(cancelButton).toBeVisible({
      timeout: 15000,
    });

    await expect(saveAndNewButton).toBeVisible({
      timeout: 15000,
    });

    const stageField = this.page.getByRole('combobox', {
      name: 'Stage',
    });

    await expect(stageField).toBeVisible({
      timeout: 10000,
    });

    /*
     * Salesforce Lightning may re-render the listbox or its option
     * while the dropdown is opening. Reacquire the visible option
     * during each retry so the interaction survives that re-render.
     */
    await expect
      .poll(
        async () => {
          try {
            const expanded = await stageField.getAttribute(
              'aria-expanded'
            );

            if (expanded !== 'true') {
              await stageField.click();
            }

            const listbox = this.page.locator(
              '[role="listbox"]:visible'
            );

            if ((await listbox.count()) !== 1) {
              return '';
            }

            const stageOption = listbox.getByRole('option', {
              name: stage,
              exact: true,
            });

            if ((await stageOption.count()) !== 1) {
              return '';
            }

            if (!(await stageOption.isVisible())) {
              return '';
            }

            await stageOption.click();

            return (
              (await stageField.getAttribute('data-value')) ?? ''
            );
          } catch {
            /*
             * Salesforce can replace the dropdown during a re-render.
             * Returning an empty value causes Playwright to retry the
             * complete interaction with fresh locators.
             */
            return '';
          }
        },
        {
          message: `Salesforce should select the "${stage}" Opportunity stage`,
          timeout: 15000,
          intervals: [250, 500, 1000, 2000],
        }
      )
      .toBe(stage);

    await stageField.press('Tab');

    /*
     * Close Date is populated only after Stage has been committed.
     * This prevents a late modal reflow from interrupting the
     * Salesforce Stage interaction.
     */
    await this.page
      .getByRole('textbox', { name: 'Close Date' })
      .fill(closeDate);

    await saveButton.click();
  }

  async advanceToStage(stage: string): Promise<void> {
    /*
     * Salesforce Path exposes stages as user-facing links. The first
     * matching link is used because the same stage text can appear
     * elsewhere in the rendered Opportunity Path.
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

    /*
     * Salesforce exposes different actions depending on whether the
     * selected stage is already current or is a future stage.
     */
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
          message: `Salesforce should expose a stage action for "${stage}"`,
          timeout: 10000,
          intervals: [250, 500, 1000],
        }
      )
      .toMatch(/current|complete/);

    if (await markCurrentStageButton.isVisible()) {
      await markCurrentStageButton.click();
      return;
    }

    await expect(markStageCompleteButton).toBeVisible({
      timeout: 5000,
    });

    await markStageCompleteButton.click();
  }
}