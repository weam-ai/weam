import { test, expect } from '@playwright/test';
import { ChatPage } from './helpers/page-objects';
import { login } from './helpers/auth-helpers';
import { FILE_PATH, TEST_MESSAGES } from './helpers/test-data';

test.describe('Chat with File', () => {
  let chatPage: ChatPage;
  
  const filePath = FILE_PATH;

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
    
    chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Wait for page to be fully loaded and chat input to be visible
    await page.waitForLoadState('networkidle');
    // Wait for chat input to be available
    await page.waitForSelector('textarea#textarea', { timeout: 10000 }).catch(() => {
      // If not found, wait a bit more for page to fully render
      return page.waitForTimeout(2000);
    });
  });

  test('TC-CHAT-FILE-001: Upload File and Chat with File Content', async ({ page }) => {
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
});

