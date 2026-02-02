import { test, expect, Page } from '@playwright/test';
import { ChatPage } from './helpers/page-objects';
import { FILE_PATH, TEST_MESSAGES, DOC } from './helpers/test-data';
import { selectBrainByName, clickDialogTabByLabel, clickAddPromptAgentDoc, searchInDialog } from './helpers/brain-helper';

/**
 * Chat with Doc helpers (scoped to this test file)
 */
class ChatWithDoc {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Select a doc by name from the doc list in the dialog
   */
  async selectDoc(docName: string) {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Find all doc items in the dialog
    // Docs are in divs with className containing "cursor-pointer" and "border-b"
    const docItems = dialog.locator('div.cursor-pointer.border-b');
    const count = await docItems.count();
    
    let targetDoc = null;
    
    // Iterate through all doc items to find the one with exact name match
    for (let i = 0; i < count; i++) {
      const item = docItems.nth(i);
      // The doc name is in a <p> tag with specific classes
      const nameElement = item.locator('p.text-font-12.font-medium.text-b2').first();
      const text = await nameElement.textContent().catch(() => null);
      if (text && text.trim() === docName) {
        targetDoc = item;
        break;
      }
    }
    
    if (!targetDoc) {
      throw new Error(`Doc with exact name "${docName}" not found`);
    }
    
    await expect(targetDoc).toBeVisible({ timeout: 10000 });
    await targetDoc.click();
    
    // Wait for dialog to close after selection
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click send chat button and wait for response to complete
   * @param prompt Optional prompt text to fill before sending
   */
  async sendChatAndWaitForResponse(prompt?: string) {
    // Wait for chat input to be ready
    const chatInput = this.page.locator('textarea#textarea');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await this.page.waitForSelector('textarea#textarea:not([disabled])', { timeout: 10000 });
    
    // Fill prompt if provided
    if (prompt) {
      await chatInput.fill(prompt);
      await this.page.waitForTimeout(500);
    }
    
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

test.describe('Chat with File', () => {
  let chatPage: ChatPage;
  let chatWithDoc: ChatWithDoc;
  
  const filePath = FILE_PATH;

  test.beforeEach(async ({ page }) => {
    // Use saved authentication state from global setup (no login needed)
    
    chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Initialize chat with doc helper
    chatWithDoc = new ChatWithDoc(page);
    
    // Wait for page to be fully loaded and chat input to be visible
    await page.waitForLoadState('networkidle');
    // Wait for chat input to be available
    await page.waitForSelector('textarea#textarea', { timeout: 10000 }).catch(() => {
      // If not found, wait a bit more for page to fully render
      return page.waitForTimeout(2000);
    });
  });

  test('UPLOAD-FILE-CHAT: Upload File and Chat with File Content', async ({ page }) => {
    // Use default selected model (no need to select Gemini)
    // Wait for chat input to be available
    const chatInput = page.getByPlaceholder(/chat with weam/i);
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await expect(chatInput).toBeEnabled({ timeout: 5000 });
    
    // Upload PDF file
    await chatPage.attachFile(filePath);
    
    // Wait for file upload to complete
    await chatPage.waitForFileUpload();
    
    // Verify file is attached (check for attached files section)
    const attachedFiles = page.locator('.attached-files');
    await expect(attachedFiles).toBeVisible({ timeout: 5000 });
    
    // Send first message about the file
    await chatInput.fill(TEST_MESSAGES.fileQuestion1);
    await chatInput.press('Enter');
    
    // Wait for first message to appear
    await page.waitForSelector('.chat-item', { timeout: 10000 });
    
    // Wait for AI response to the file question
    await page.waitForSelector('.chat-content, [class*="loading"], [class*="stream"]', { 
      timeout: 60000 
    });
    
    // Wait for response to have actual content
    await page.waitForFunction(
      () => {
        const chatContents = document.querySelectorAll('.chat-content');
        if (chatContents.length === 0) return false;
        const lastResponse = chatContents[chatContents.length - 1];
        const text = lastResponse.textContent || '';
        return text.trim().length > 10;
      },
      { timeout: 60000 }
    ).catch(() => {
      console.log('First response text not fully loaded, but continuing...');
    });
    
    // Wait for input to be enabled again
    await chatPage.waitForInputReady();
    await page.waitForTimeout(2000);
    
    // Send second message about the file
    const chatInputSecond = page.getByPlaceholder(/chat with weam/i);
    await expect(chatInputSecond).toBeVisible({ timeout: 10000 });
    await expect(chatInputSecond).toBeEnabled({ timeout: 10000 });
    
    await chatInputSecond.fill(TEST_MESSAGES.fileQuestion2);
    await chatInputSecond.press('Enter');
    
    // Wait for second message to appear
    await page.waitForSelector('.chat-item', { timeout: 10000 });
    
    // Wait for second AI response
    console.log('Waiting for second AI response...');
    await page.waitForSelector('.chat-content, [class*="loading"], [class*="stream"]', { 
      timeout: 60000 
    }).catch(() => {
      return page.waitForTimeout(5000);
    });
    
    // Wait for second response to have text content
    await page.waitForFunction(
      () => {
        const chatContents = document.querySelectorAll('.chat-content');
        if (chatContents.length < 2) return false;
        const lastResponse = chatContents[chatContents.length - 1];
        const text = lastResponse.textContent || '';
        return text.trim().length > 10;
      },
      { timeout: 60000 }
    ).catch(() => {
      console.log('Second response text not fully loaded, but continuing...');
    });
    
    // Verify both messages appear in conversation
    const chatItems = page.locator('.chat-item');
    const chatContent = page.locator('.chat-content');
    const itemCount = await chatItems.count();
    const contentCount = await chatContent.count();
    
    // Should have at least 2 chat items (2 user messages)
    expect(itemCount).toBeGreaterThanOrEqual(2);
    
    // Should have at least 2 responses (AI responses)
    expect(contentCount).toBeGreaterThanOrEqual(2);
    
    // Verify conversation maintains context (both messages are present)
    await expect(page.getByText(TEST_MESSAGES.fileQuestion1)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_MESSAGES.fileQuestion2)).toBeVisible({ timeout: 5000 });
    
    // Keep browser open to see responses
    console.log('Both responses received. Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
  });

  test('SELECT-FILE-CHAT: Select File and Chat with File Content', async ({ page }) => {
    // Use default selected model (no need to select Gemini)
    
    // Select the brain directly via helper
    await selectBrainByName(page, DOC.brain);
    
    // Click on "Add prompt, agent and doc" button
    await clickAddPromptAgentDoc(page);
    
    // Click on the Docs tab in the popup using helper
    await clickDialogTabByLabel(page, 'Docs');
    
    // Select the specific doc
    await chatWithDoc.selectDoc(DOC.doc);
    
    // Click on send chat and wait for response
    await chatWithDoc.sendChatAndWaitForResponse(DOC.prompt);
  });

  test('SEARCH-FILE-CHAT: Search File and Chat with File Content', async ({ page }) => {
    // Select the brain directly via helper
    await selectBrainByName(page, DOC.brain);
    
    // Click on "Add prompt, agent and doc" button
    await clickAddPromptAgentDoc(page);
    
    // Click on the Docs tab in the popup using helper
    await clickDialogTabByLabel(page, 'Docs');
    
    // Search for the specific doc
    await searchInDialog(page, DOC.doc, 'Docs');
    
    // Select the doc from search results
    await chatWithDoc.selectDoc(DOC.doc);
    
    // Click on send chat and wait for response
    await chatWithDoc.sendChatAndWaitForResponse(DOC.prompt);
  });
});

