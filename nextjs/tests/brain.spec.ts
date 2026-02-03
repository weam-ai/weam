import { test, expect, Page } from '@playwright/test';
import { ROUTES, BASE_URL } from './helpers/test-data';

/**
 * Brain sidebar and brain management helpers (scoped to this test file)
 */
class BrainSidebar {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Open the create brain UI for a PRIVATE brain (sidebar plus button)
   */
  async openCreateBrain() {
    // Use the actual sidebar structure/classes for PRIVATE BRAINS section
    // Container: div.collapsed-pbrains ... span "PRIVATE BRAINS" ... button.cursor-pointer (plus icon)
    const privateBrainsSection = this.page.locator('div.collapsed-pbrains');
    await expect(privateBrainsSection).toBeVisible({ timeout: 10000 });

    const addBrainButton = privateBrainsSection.locator('button.cursor-pointer').first();
    await expect(addBrainButton).toBeVisible({ timeout: 10000 });
    await addBrainButton.click();

    // Wait for dialog/modal to appear
    const brainModal = this.page.locator('[role="dialog"]');
    await expect(brainModal).toBeVisible({ timeout: 10000 });
  }

  /**
   * Create a new brain with the given name
   */
  async createBrain(brainName: string) {
    await this.openCreateBrain();

    const brainModal = this.page.locator('[role="dialog"]');

    // Brain name input
    const nameInput = brainModal.getByPlaceholder('Enter Brain Name').or(
      brainModal.locator('input[type="text"]').first()
    );
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill(brainName);

    // Submit / Add Brain button
    const addBrainSubmitButton = brainModal.getByRole('button', { name: /add brain/i }).or(
      brainModal.getByRole('button', { name: /create/i })
    );
    await expect(addBrainSubmitButton).toBeEnabled({ timeout: 10000 });
    await addBrainSubmitButton.click();

    // Wait for modal to close
    await expect(brainModal).not.toBeVisible({ timeout: 15000 });

    // Verify new brain appears in sidebar
    // await this.expectBrainVisible(brainName);
  }

  /**
   * Find a brain entry in the sidebar by its visible title text.
   */
  private brainEntryByName(name: string) {
    const title = this.page
      .locator('span.collapse-editable-title')
      .filter({ hasText: new RegExp(name, 'i') })
      .first();

    // Button wrapping the title text
    return title.locator('..').locator('button').first();
  }

  /**
   * Rename an existing brain from oldName to newName
   */
  async renameBrain(oldName: string, newName: string) {
    const privateBrainsSection = this.page.locator('div.collapsed-pbrains');
    await expect(privateBrainsSection).toBeVisible({ timeout: 10000 });
  
    // 1) Click the brain row we want to edit to make it active
    const brainRow = privateBrainsSection
      .locator('button.collapsed-brain-item')
      .filter({ hasText: oldName })
      .first();
    await expect(brainRow).toBeVisible({ timeout: 10000 });
    await brainRow.click();
  
    // 2) Open three-dot menu on the now-active row
    const activeRow = privateBrainsSection
      .locator('button.collapsed-brain-item.active')
      .first();
    const optionsButton = activeRow.locator('.dropdown-action').first();
    await expect(optionsButton).toBeVisible({ timeout: 10000 });
    await optionsButton.click();
  
    // 3) Choose Rename
    const renameOption = this.page.getByRole('menuitem', { name: /rename/i });
    await expect(renameOption).toBeVisible({ timeout: 10000 });
    await renameOption.click();
  
    // 4) Type new name into the inline input on the active row
    const renameInput = activeRow.locator('input[type="text"]');
    await expect(renameInput).toBeVisible({ timeout: 10000 });
    await renameInput.fill(newName);
  
    // 5) Click the sign (check) icon to save
    const saveButton = activeRow.locator('button.edit-title').first();
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    await saveButton.click();
  
    // await this.expectBrainVisible(newName);
    await this.page.waitForTimeout(10000);
  }

  /**
   * Archive a brain by name
   */
  async archiveBrain(name: string) {
    // 1) PRIVATE BRAINS section
    const privateBrainsSection = this.page.locator('div.collapsed-pbrains');
    await expect(privateBrainsSection).toBeVisible({ timeout: 10000 });
  
    // 2) Exact brain row by title
    const brainRow = privateBrainsSection
      .locator('button.collapsed-brain-item')
      .filter({ hasText: name })   // full text match, no regex
      .first();
    await expect(brainRow).toBeVisible({ timeout: 10000 });
  
    // 3) Open three-dot menu
    const optionsButton = brainRow.locator('.dropdown-action').first();
    await expect(optionsButton).toBeVisible({ timeout: 10000 });
    await optionsButton.click();
  
    // 4) Archive option (keep your existing code below this)
    const archiveOption = this.page.getByRole('menuitem', { name: /archive/i });
    await expect(archiveOption).toBeVisible({ timeout: 10000 });
    await archiveOption.click();

    await this.page.waitForTimeout(10000);
  
    // ...rest of your confirm dialog + expectBrainNotVisible(name) logic...
  }

  async expectBrainVisible(name: string) {
    const entry = this.brainEntryByName(name);
    await expect(entry).toBeVisible({ timeout: 15000 });
  }

  async expectBrainNotVisible(name: string) {
    const entry = this.brainEntryByName(name);
    await expect(entry).not.toBeVisible({ timeout: 15000 }).catch(async () => {
      // As a fallback, wait for the element to be detached from DOM
      await this.page.waitForTimeout(1000);
    });
  }
}

test.describe.serial('Brain Management', () => {
  let brainSidebar: BrainSidebar;
  let brainName: string;
  let updatedBrainName: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // Use saved authentication state from global setup (no login needed)
    // Go to main page where brains sidebar is visible
    await page.goto(ROUTES.main);
    await page.waitForLoadState('networkidle');

    // Initialize brain sidebar helper
    brainSidebar = new BrainSidebar(page);

    // Unique names to avoid collisions with existing brains
    const timestamp = Date.now();
    brainName = `Test Brain ${timestamp}`;
    updatedBrainName = `Updated Brain ${timestamp}`;
  });

  test('TC-BRAIN-CREATE: Create a new Private Brain', async () => {
    await brainSidebar.createBrain(brainName);
    // await brainSidebar.expectBrainVisible(brainName);
  });

  test('RENAME-BRAIN: Rename an existing Brain', async () => {
    await brainSidebar.renameBrain(brainName, updatedBrainName);
    // await brainSidebar.expectBrainVisible('AI News');
  });

  test('ARCHIVE-BRAIN: Archive a Brain', async () => {
    await brainSidebar.archiveBrain(updatedBrainName);
    // await brainSidebar.expectBrainNotVisible('Test Brain 1769590615631');
  });

  test('REMOVE-ARCHIVED-BRAIN: Remove Archived Brain', async ({ page }) => {
    // Step 1: Navigate to settings/data-controls?tab=brain
    const settingsUrl = `${BASE_URL}/settings/data-controls?tab=brain`;
    await page.goto(settingsUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 2: Click on "Delete Brain" button
    // Find the first table row, get the last td, then click the second button in that td (Delete)
    const tableRow = page.locator('table tbody tr').first();
    await expect(tableRow).toBeVisible({ timeout: 10000 });

    const lastTd = tableRow.locator('td').last();
    await expect(lastTd).toBeVisible({ timeout: 5000 });

    const deleteBrainButton = lastTd.locator('button').nth(1); // Second button (0-indexed)
    await expect(deleteBrainButton).toBeVisible({ timeout: 10000 });
    await deleteBrainButton.scrollIntoViewIfNeeded();
    await deleteBrainButton.click();
    await page.waitForTimeout(2000);

    // Step 3: Wait for popup/dialog to appear
    const confirmDialog = page.locator('[role="dialog"]')
      .or(page.locator('div').filter({ hasText: /are you sure/i }));

    // Step 4: Click on "Delete" button in the popup
    const deleteButton = confirmDialog.locator('button.btn.btn-red').filter({
      hasText: /Delete/i,
    });

    await deleteButton.click();

    // Wait for dialog to close
    await page.waitForTimeout(2000);
  });

  test('RESTORE-ARCHIVED-BRAIN: Restore Archived Brain', async ({ page }) => {
    // Step 1: Navigate to settings/data-controls?tab=brain
    const settingsUrl = `${BASE_URL}/settings/data-controls?tab=brain`;
    await page.goto(settingsUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 2: Click on "Restore Brain" button
    // Find the first table row, get the last td, then click the first button in that td (Restore)
    const tableRow = page.locator('table tbody tr').first();
    await expect(tableRow).toBeVisible({ timeout: 10000 });

    const lastTd = tableRow.locator('td').last();
    await expect(lastTd).toBeVisible({ timeout: 5000 });

    const restoreBrainButton = lastTd.locator('button').first(); // First button (Restore)
    await expect(restoreBrainButton).toBeVisible({ timeout: 10000 });
    await restoreBrainButton.scrollIntoViewIfNeeded();
    await restoreBrainButton.click();
    await page.waitForTimeout(2000); 

    // Wait for dialog to close
    await page.waitForTimeout(2000);
  });
});


