import { Page, expect } from '@playwright/test';

/**
 * Select a brain in the sidebar by its exact name.
 * Ensures we match exactly (e.g. "AI News") and not partial matches
 * like "Recent AI News".
 */
export async function selectBrainByName(page: Page, name: string) {
  const privateBrainsSection = page.locator('div.collapsed-pbrains');
  await expect(privateBrainsSection).toBeVisible({ timeout: 10000 });

  // Find the exact brain by checking all brain buttons and their title spans
  const allBrainButtons = privateBrainsSection.locator('button.collapsed-brain-item');
  const count = await allBrainButtons.count();

  let targetBrainRow: ReturnType<typeof allBrainButtons.nth> | null = null;

  for (let i = 0; i < count; i++) {
    const button = allBrainButtons.nth(i);
    const titleSpan = button.locator('span.collapse-editable-title').first();
    const text = await titleSpan.textContent().catch(() => null);

    if (text && text.trim() === name) {
      targetBrainRow = button;
      break;
    }
  }

  if (!targetBrainRow) {
    throw new Error(`Brain with exact name "${name}" not found`);
  }

  await expect(targetBrainRow).toBeVisible({ timeout: 10000 });
  await targetBrainRow.click();

  // Wait for brain to be selected/active
  await page.waitForTimeout(1000);
}

/**
 * Click a tab inside the brain/agent dialog by its label.
 * Example: tabLabel = "Agents" | "Prompts" | "Docs"
 */
export async function clickDialogTabByLabel(page: Page, tabLabel: string) {
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 10000 });

  // Try to find the tab by role first, then fall back to text
  const tab = dialog
    .getByRole('tab', { name: new RegExp(`^${tabLabel}$`, 'i') })
    .or(dialog.getByText(new RegExp(`^${tabLabel}$`, 'i')).first());

  await expect(tab).toBeVisible({ timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(500);
}

/**
 * Click the "Add prompt, agent and doc" button in the chat footer.
 */
export async function clickAddPromptAgentDoc(page: Page) {
  // Approach 1: button with aria-haspopup="dialog" that contains chat-btn
  let addButton = page
    .locator('button[aria-haspopup="dialog"]')
    .filter({ has: page.locator('div.chat-btn') })
    .first();

  // Check if visible, if not try approach 2
  const isVisible1 = await addButton.isVisible({ timeout: 2000 }).catch(() => false);

  if (!isVisible1) {
    // Approach 2: div.chat-btn with cursor-pointer that contains SVG
    addButton = page
      .locator('div.chat-btn.cursor-pointer')
      .filter({ has: page.locator('svg') })
      .first();
  }

  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();

  // Wait for popup/dialog to appear
  const popup = page.locator('[role="dialog"]');
  await expect(popup).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500);
}



