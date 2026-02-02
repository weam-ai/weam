import { test, expect, Page } from '@playwright/test';
import { ROUTES, PROMPT } from './helpers/test-data';
import { selectBrainByName, clickDialogTabByLabel, clickAddPromptAgentDoc, searchInDialog } from './helpers/brain-helper';

/**
 * Chat with Prompt helpers (scoped to this test file)
 */
class ChatWithPrompt {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Select a prompt by name from the prompt list in the dialog
   */
  async selectPrompt(promptName: string) {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Find all prompt items in the dialog
    // Prompts are in divs with className containing "cursor-pointer" and "border-b"
    const promptItems = dialog.locator('div.cursor-pointer.border-b');
    const count = await promptItems.count();
    
    let targetPrompt = null;
    
    // Iterate through all prompt items to find the one with exact name match
    for (let i = 0; i < count; i++) {
      const item = promptItems.nth(i);
      // The prompt title is in a <p> tag with specific classes
      const titleElement = item.locator('p.text-font-12.text-b2.font-medium').first();
      const text = await titleElement.textContent().catch(() => null);
      if (text && text.trim() === promptName) {
        targetPrompt = item;
        break;
      }
    }
    
    if (!targetPrompt) {
      throw new Error(`Prompt with exact name "${promptName}" not found`);
    }
    
    await expect(targetPrompt).toBeVisible({ timeout: 10000 });
    await targetPrompt.click();
    
    // Wait for dialog to close after selection
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click send chat button and wait for response to complete
   */
  async sendChatAndWaitForResponse() {
    // Wait for chat input to be ready
    const chatInput = this.page.locator('textarea#textarea');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await this.page.waitForSelector('textarea#textarea:not([disabled])', { timeout: 10000 });
    
    // Find and click the send button
    const sendButton = this.page.locator('button.chat-submit:not([disabled])').or(
      this.page.locator('button[type="submit"]:not([disabled])')
    );
    
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      // Fallback to Enter key
      await chatInput.press('Enter');
    }
    
    // Wait for user message to appear
    await this.page.waitForSelector('.chat-item', { timeout: 10000 });
    
    // Wait for response to start (loading indicator or response content)
    await this.page.waitForSelector('.chat-content, [class*="loading"], [class*="stream"]', { 
      timeout: 30000 
    }).catch(() => {
      // If no response indicator found, wait a bit
      return this.page.waitForTimeout(5000);
    });
    
    // Wait for response to complete - input should be enabled again
    await this.page.waitForFunction(
      () => {
        const textarea = document.querySelector('textarea#textarea') as HTMLTextAreaElement | null;
        return textarea !== null && !textarea.disabled;
      },
      { timeout: 60000 }
    );
    
    // Additional wait to ensure response is fully rendered
    await this.page.waitForTimeout(2000);
  }
}

test.describe('Chat with Prompt', () => {
  let chatWithPrompt: ChatWithPrompt;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Use saved authentication state from global setup (no login needed)
    // Go to main page where brains sidebar is visible
    await page.goto(ROUTES.main);
    await page.waitForLoadState('networkidle');

    // Initialize chat with prompt helper
    chatWithPrompt = new ChatWithPrompt(page);
  });

  test('SELECT-PROMPT-CHAT: Select brain, prompt and chat', async () => {
    // Select the brain directly via helper
    await selectBrainByName(page, PROMPT.brain);
    
    // Click on "Add prompt, agent and doc" button
    await clickAddPromptAgentDoc(page);
    
    // Click on the prompt tab in the popup using helper
    await clickDialogTabByLabel(page, 'Prompts');
    await page.waitForTimeout(2000);
    
    // Select "Landing Page Headlines" prompt
    await chatWithPrompt.selectPrompt(PROMPT.prompt);
    await page.waitForTimeout(2000);
    
    // Click on send chat and wait for response
    await chatWithPrompt.sendChatAndWaitForResponse();
    await page.waitForTimeout(2000);
  });

  test('SEARCH-PROMPT-CHAT: Search Prompt and Chat with Prompt Content', async () => {
    // Select the brain directly via helper
    await selectBrainByName(page, PROMPT.brain);
    
    // Click on "Add prompt, agent and doc" button
    await clickAddPromptAgentDoc(page);
    
    // Click on the prompt tab in the popup using helper
    await clickDialogTabByLabel(page, 'Prompts');
    
    // Search for the specific prompt
    await searchInDialog(page, PROMPT.prompt, 'Prompts');
    
    // Select the prompt from search results
    await chatWithPrompt.selectPrompt(PROMPT.prompt);
    
    // Click on send chat and wait for response
    await chatWithPrompt.sendChatAndWaitForResponse();
  });
});

