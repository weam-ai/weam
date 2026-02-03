import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/test-data';

test.describe('Billing - Storage Requests', () => {
  test('STORAGE-REQUEST-ACCEPT: Approve Storage Request', async ({ page }) => {
    // Step 1: Open settings/billing page
    const billingUrl = `${BASE_URL}/settings/billing`;
    await page.goto(billingUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 2: Click on "Approve / Decline" button
    const approveDeclineButton = page.getByRole('button', {
      name: /approve\s*\/\s*decline/i,
    });

    await expect(approveDeclineButton).toBeVisible({ timeout: 10000 });
    await approveDeclineButton.click();
    await page.waitForTimeout(1000);

    // Step 3: From dialog click on "Approve" button
    // Dialog structure:
    // <div class="flex items-center justify-end gap-2.5 pb-[30px] px-[30px]">
    //   <button class="btn btn-outline-gray">Decline</button>
    //   <button class="btn btn-black">Approve</button>
    // </div>

    const dialog = page.locator('[role="dialog"]').or(
      page.locator('div').filter({ hasText: /approve/i }),
    );

    // await expect(dialog).toBeVisible({ timeout: 10000 });

    const approveButton = dialog.locator('button.btn.btn-black').filter({
      hasText: /approve/i,
    });

    // await expect(approveButton).toBeVisible({ timeout: 10000 });
    await approveButton.click();

    // Wait for dialog to close / action to complete
    await page.waitForTimeout(2000);
  });

  test('STORAGE-REQUEST-ADD: Request More Storage', async ({ page }) => {
    // Step 1: Open settings/data-controls?tab=storage page
    const storageUrl = `${BASE_URL}/settings/data-controls?tab=storage`;
    await page.goto(storageUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // After page load, explicitly select the "Storage" tab from tablist
    const storageTab = page.getByRole('tab', { name: /^Storage$/i });
    await expect(storageTab).toBeVisible({ timeout: 10000 });
    await storageTab.click();
    await page.waitForTimeout(1000);

    // Step 2: Click on "Request For More Storage" button
    // Html:
    // <div class="flex flex-col justify-center items-center">
    //   <p class="mb-2.5 text-font-16 font-normal text-b2">Need more storage?</p>
    //   <button class="btn btn-outline-gray">Request For More Storage</button>
    // </div>
    const requestMoreButton = page.getByRole('button', {
      name: /request\s+for\s+more\s+storage/i,
    });

    await requestMoreButton.click();

    // Step 3: Click on "Request" button in the dialog
    // Html: <button class="btn btn-black">Request</button>
    const requestButton = page
      .locator('button.btn.btn-black')
      .filter({ hasText: /request/i });

    await requestButton.click();
    await page.waitForTimeout(2000);
  });
});

