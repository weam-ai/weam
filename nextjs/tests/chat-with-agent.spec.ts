import { test, expect, Page } from '@playwright/test';
import { ROUTES, AGENT } from './helpers/test-data';
import { selectBrainByName, clickDialogTabByLabel, clickAddPromptAgentDoc, searchInDialog } from './helpers/brain-helper';

/**
 * Chat with Agent helpers (scoped to this test file)
 */
class ChatWithAgent {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Select a brain by clicking on it in the sidebar (delegates to helper)
   */
  // async selectBrain(name: string) {
  //   await selectBrainByName(this.page, name);
  // }

  /**
   * Select an agent by name from the agent list in the dialog
   */
  async selectAgent(agentName: string) {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Find all agent items in the dialog
    // Agents are in divs with className containing "cursor-pointer" and "border-b"
    const agentItems = dialog.locator('div.cursor-pointer.border-b');
    const count = await agentItems.count();
    
    let targetAgent = null;
    
    // Iterate through all agent items to find the one with exact name match
    for (let i = 0; i < count; i++) {
      const item = agentItems.nth(i);
      // The agent title is in a <p> tag with specific classes
      const titleElement = item.locator('p.text-font-12.font-medium.text-b2').first();
      const text = await titleElement.textContent().catch(() => null);
      if (text && text.trim() === agentName) {
        targetAgent = item;
        break;
      }
    }
    
    if (!targetAgent) {
      throw new Error(`Agent with exact name "${agentName}" not found`);
    }
    
    await expect(targetAgent).toBeVisible({ timeout: 10000 });
    await targetAgent.click();
    
    // Wait for dialog to close after selection
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Send a prompt message and wait for response to complete
   */
  async sendPromptAndWaitForResponse(prompt: string) {
    // Wait for chat input to be ready
    const chatInput = this.page.locator('textarea#textarea');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await this.page.waitForSelector('textarea#textarea:not([disabled])', { timeout: 10000 });
    
    // Type the prompt
    await chatInput.fill(prompt);
    await this.page.waitForTimeout(500);
    
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

test.describe('Chat with Agent', () => {
  let chatWithAgent: ChatWithAgent;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Use saved authentication state from global setup (no login needed)
    // Go to main page where brains sidebar is visible
    await page.goto(ROUTES.main);
    await page.waitForLoadState('networkidle');

    // Initialize chat with agent helper
    chatWithAgent = new ChatWithAgent(page);
  });

  test('SELECT-AGENT-CHAT: Select brain, agent and chat', async () => {
    // Select the brain directly via helper
    await selectBrainByName(page, AGENT.brain);
    
    // Click on "Add prompt, agent and doc" button
    await clickAddPromptAgentDoc(page);
    
    // Click on the agent tab in the popup using helper
    await clickDialogTabByLabel(page, 'Agents');
    
    // Select "Blog Topic Generator" agent
    await chatWithAgent.selectAgent(AGENT.agent);
    
    // Write a prompt and wait for response
    await chatWithAgent.sendPromptAndWaitForResponse(AGENT.prompt);
  });

  test('SEARCH-AGENT-CHAT: Search Agent and Chat with Agent Content', async () => {
    // Select the brain directly via helper
    await selectBrainByName(page, AGENT.brain);
    
    // Click on "Add prompt, agent and doc" button
    await clickAddPromptAgentDoc(page);
    
    // Click on the agent tab in the popup using helper
    await clickDialogTabByLabel(page, 'Agents');
    
    // Search for the specific agent
    await searchInDialog(page, AGENT.agent, 'Agents');
    
    // Select the agent from search results
    await chatWithAgent.selectAgent(AGENT.agent);
    
    // Write a prompt and wait for response
    await chatWithAgent.sendPromptAndWaitForResponse(AGENT.prompt);
  });
});

