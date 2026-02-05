import { test, expect } from '@playwright/test';
import { ROUTES, AGENT } from './helpers/test-data';
import { selectBrainByName } from './helpers/brain-helper';

test.describe('Chat Management', () => {
  test('CHAT-REMOVE: Remove Chat', async ({ page }) => {
    // Step 1: Select brain using existing helper
    // Navigate to main page first
    await page.goto(ROUTES.main);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Select the brain from test-data (using AGENT.brain which is 'AI News')
    await selectBrainByName(page, AGENT.brain);
    await page.waitForTimeout(1000);

    // Step 2: Click on "Chats" button
    const chatsButton = page.getByRole('button', { name: /chats/i }).filter({
      has: page.locator('svg'),
    });
    
    await chatsButton.click();
    await page.waitForTimeout(2000);

    // Step 3: Select delete button
    // The delete button is a sibling of div.w-full, not inside it
    // Structure: <div class="relative flex...">
    //   <div class="w-full">...</div>
    //   <a>delete button</a>  <- This is a sibling next to div.w-full
    const wFullDiv = page.locator('div.w-full').first();
    
    // Find the parent container
    const chatContainer = wFullDiv.locator('..');

    // Find the delete button - it's a sibling <a> tag next to div.w-full (not inside div.w-full)
    // Use XPath to find the sibling <a> tag that comes after div.w-full
    // Or find all <a> tags in the parent and filter for the one with delete icon
    const deleteButton = chatContainer
      .locator('> a')  // Direct child <a> tags only (siblings of div.w-full)
      .filter({
        has: page.locator('svg path[d*="M13.8182"]'),
      })
      .first();

    // await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();
    await page.waitForTimeout(2000);
  });
});

