import { test, expect, Page } from '@playwright/test';
import { ROUTES, AGENT, PROMPT } from './helpers/test-data';
import { selectBrainByName } from './helpers/brain-helper';

/**
 * Assign Prompt and Agent helpers (scoped to this test file)
 */
class AssignPromptAgent {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Click the "Agents and Prompt Library" button in the sidebar footer
   */
  async clickAgentsAndPromptLibrary() {
    // Find the button by its tooltip text or by locating the TemplateLibrary component
    // The button is in the sidebar footer
    const sidebarFooter = this.page.locator('.sidebar-footer');
    await expect(sidebarFooter).toBeVisible({ timeout: 10000 });

    // Find the button with tooltip "Agents and Prompts library" or by the link href
    // The button is a link to /custom-templates
    const libraryButton = sidebarFooter
      .locator('a[href="/custom-templates"]')
      .or(sidebarFooter.getByRole('link', { name: /agents.*prompts.*library/i }))
      .first();

    await expect(libraryButton).toBeVisible({ timeout: 10000 });
    await libraryButton.click();

    // Wait for navigation to the custom templates page
    await this.page.waitForURL('**/custom-templates**', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click on a tab in the Agents and Prompts Library page
   * @param tabName "Agents" or "Prompts"
   */
  async clickLibraryTab(tabName: 'Agents' | 'Prompts') {
    // Find the tab by its role and text
    const tab = this.page
      .getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') })
      .first();

    await expect(tab).toBeVisible({ timeout: 10000 });
    await tab.click();
    await this.page.waitForTimeout(1000); // Wait for tab content to load
  }

  /**
   * Click the "move to brain" button for a specific agent or prompt
   * This opens the assign dialog
   * @param itemName Name of the agent or prompt
   */
  async clickMoveToBrainButton(itemName: string) {
    // Wait for items to load - items can be in different structures:
    // Agents: div.border.px-5.py-3.rounded-lg
    // Prompts: div.border.p-5.rounded-lg
    // Try to find items with either structure
    const items = this.page.locator('div.border.rounded-lg').filter({ 
      has: this.page.locator('h4')
    });
    
    // Wait for at least one item to be visible
    await expect(items.first()).toBeVisible({ timeout: 15000 });
    
    // Wait a bit for all items to load
    await this.page.waitForTimeout(2000);
    
    const count = await items.count();

    let targetItem = null;

    // Iterate through all items to find the one with exact name match
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      
      // Scroll item into view to ensure it's visible
      await item.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300);
      
      // The item title is in an h4 tag (can have different classes)
      const titleElement = item.locator('h4').first();
      const text = await titleElement.textContent().catch(() => null);
      if (text && text.trim() === itemName) {
        targetItem = item;
        break;
      }
    }

    if (!targetItem) {
      // If not found, try searching with a more flexible approach
      // Maybe the item needs to be scrolled into view or loaded
      const allItems = this.page.locator('div.border.rounded-lg');
      const allCount = await allItems.count();
      
      for (let i = 0; i < allCount; i++) {
        const item = allItems.nth(i);
        await item.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(300);
        
        const titleElement = item.locator('h4').first();
        const text = await titleElement.textContent().catch(() => null);
        if (text && text.trim() === itemName) {
          targetItem = item;
          break;
        }
      }
    }

    if (!targetItem) {
      throw new Error(`Library item with exact name "${itemName}" not found. Available items may need to load or the name may be different.`);
    }

    await expect(targetItem).toBeVisible({ timeout: 10000 });
    await targetItem.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    // Find the buttons container - can be either:
    // Agents: div.ml-auto.flex.items-center
    // Prompts: div.ml-auto.flex
    let buttonsContainer = targetItem.locator('div.ml-auto.flex.items-center');
    const isVisible = await buttonsContainer.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isVisible) {
      // Try the prompts structure
      buttonsContainer = targetItem.locator('div.ml-auto.flex');
    }
    
    await expect(buttonsContainer).toBeVisible({ timeout: 10000 });
    
    // Based on the HTML provided, the first button (index 0) is the "move to brain" button
    // It has aria-haspopup="dialog" and contains an SVG with the copy/move icon
    // Find all buttons with aria-haspopup="dialog" in this container
    const dialogButtons = buttonsContainer.locator('button[aria-haspopup="dialog"]');
    const buttonCount = await dialogButtons.count();
    
    if (buttonCount === 0) {
      // Fallback: try to find any button in the container
      const allButtons = buttonsContainer.locator('button');
      const allButtonCount = await allButtons.count();
      if (allButtonCount > 0) {
        // The first button should be the "move to brain" button
        const moveButton = allButtons.first();
        await expect(moveButton).toBeVisible({ timeout: 10000 });
        await moveButton.click();
      } else {
        throw new Error('Could not find "move to brain" button');
      }
    } else {
      // The first button (index 0) is the "move to brain" button
      const moveButton = dialogButtons.first();
      await expect(moveButton).toBeVisible({ timeout: 10000 });
      await moveButton.click();
    }
    
    // Wait for the assign dialog to appear
    await this.page.waitForTimeout(1000);
  }

  /**
   * Assign the selected agent/prompt to a brain
   * This will open a dialog/modal (MovetoBrainModal) to assign to brain
   * @param brainName Name of the brain to assign to
   */
  async assignToBrain(brainName: string) {
    // Wait for the MovetoBrainModal dialog to appear
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Find the brain checkbox by its label text
    // The brain name is in a label, and there's a checkbox next to it
    const brainLabel = dialog.locator('label').filter({ hasText: brainName }).first();
    await expect(brainLabel).toBeVisible({ timeout: 10000 });
    
    // Find the checkbox associated with this label
    // The checkbox has type="checkbox" and role="switch"
    const checkbox = brainLabel.locator('..').locator('input[type="checkbox"][role="switch"]').first();
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    
    // Check if already checked, if not, click to check it
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.click();
      await this.page.waitForTimeout(500);
    }
    
    // Find and click the assign button in the dialog footer
    // The button is disabled when no brain is selected, so wait for it to be enabled
    const assignButton = dialog.locator('button.btn.btn-black').filter({ 
      hasNotText: /disabled/ 
    });
    
    await expect(assignButton).toBeEnabled({ timeout: 10000 });
    await assignButton.click();
    
    // Wait for dialog to close and assignment to complete
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }
}

test.describe('Assign Prompt and Agent to Brain', () => {
  let assignHelper: AssignPromptAgent;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Use saved authentication state from global setup (no login needed)
    // Go to main page where sidebar is visible
    await page.goto(ROUTES.main);
    await page.waitForLoadState('networkidle');

    // Initialize assign helper
    assignHelper = new AssignPromptAgent(page);
  });

  test('ASSIGN-AGENT-TO-BRAIN: Assign Agent to Brain', async () => {
    // Click on "Agents and Prompt Library" button from sidebar footer
    await assignHelper.clickAgentsAndPromptLibrary();
    
    // Select Agents tab
    await assignHelper.clickLibraryTab('Agents');
    
    // Click on "move to brain" button for the agent
    await assignHelper.clickMoveToBrainButton(AGENT.agent);
    
    // Select a brain and assign the agent to it
    await assignHelper.assignToBrain(AGENT.brain);
  });

  test('ASSIGN-PROMPT-TO-BRAIN: Assign Prompt to Brain', async () => {
    // Click on "Agents and Prompt Library" button from sidebar footer
    await assignHelper.clickAgentsAndPromptLibrary();
    
    // Select Prompts tab
    await assignHelper.clickLibraryTab('Prompts');
    
    // Click on "move to brain" button for the prompt
    await assignHelper.clickMoveToBrainButton(PROMPT.prompt);
    
    // Select a brain and assign the prompt to it
    await assignHelper.assignToBrain(PROMPT.brain);
  });
});

