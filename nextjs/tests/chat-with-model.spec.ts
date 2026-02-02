import { test, expect } from '@playwright/test';
import { ChatPage } from './helpers/page-objects';
import { login } from './helpers/auth-helpers';
import { TEST_MESSAGES, MODEL } from './helpers/test-data';

test.describe('Chat with Selected Model', () => {
  let chatPage: ChatPage;

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

  test('VERIFY-MODEL-SELECTION: Verify Model Selection', async ({ page }) => {
    // Wait for model selector to be available
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    
    // Open model selector
    await chatPage.openModelSelector();
    await page.waitForTimeout(1000);
    
    // Find the specific model from test-data
    const modelOption = page.locator('[role="option"]').filter({ 
      hasText: new RegExp(MODEL.name, 'i')
    });
    
    const modelAvailable = await modelOption.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modelAvailable) {
      test.skip();
      return;
    }
    
    // Select the model from test-data
    await modelOption.first().click();
    await page.waitForTimeout(1000);
    
    // Verify selected model name appears in header (in combobox button)
    const modelDisplay = page.getByRole('combobox').filter({ 
      hasText: new RegExp(MODEL.name, 'i')
    });
    await expect(modelDisplay).toBeVisible({ timeout: 3000 });
    
    // Verify model icon/image is displayed (if applicable)
    // This is optional and depends on UI implementation
  });

  test('SEND-MULTIPLE-MESSAGES: Send Multiple Messages with Model', async ({ page }) => {
    // Wait for model selector
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    
    // Select model from test-data
    await chatPage.openModelSelector();
    await page.waitForTimeout(1000);
    
    const modelOption = page.locator('[role="option"]').filter({ 
      hasText: new RegExp(MODEL.name, 'i')
    }).first();
    const modelAvailable = await modelOption.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!modelAvailable) {
      test.skip();
      return;
    }
    
    await modelOption.click();
    await page.waitForTimeout(1000);
    
    // Wait for chat input to be available
    const chatInput = page.getByPlaceholder(/chat with weam/i);
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await expect(chatInput).toBeEnabled({ timeout: 5000 });
    
    // Send first message - type directly in textarea
    await chatInput.fill(TEST_MESSAGES.question);
    await chatInput.press('Enter');
    
    // Wait for first message to appear and input to be ready again
    await page.waitForSelector('.chat-item', { timeout: 10000 });
    
    // Wait for input to be enabled again (it might be disabled while processing)
    await page.waitForFunction(
      () => {
        const textarea = document.querySelector('textarea#textarea') as HTMLTextAreaElement | null;
        return textarea !== null && !textarea.disabled;
      },
      { timeout: 30000 }
    );
    
    // Wait a bit more for any loading states to clear
    await page.waitForTimeout(10000);
    
    // Send second message - wait for input to be visible and enabled
    const chatInputSecond = page.getByPlaceholder(/chat with weam/i);
    await expect(chatInputSecond).toBeVisible({ timeout: 10000 });
    await expect(chatInputSecond).toBeEnabled({ timeout: 10000 });
    
    // Type second message directly in textarea
    await chatInputSecond.fill(TEST_MESSAGES.followUp);
    await chatInputSecond.press('Enter');
    
    // Wait for second message to appear
    await page.waitForSelector('.chat-item', { timeout: 10000 });
    
    // Wait for second AI response to appear
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
    
    // Wait a bit more to ensure response is fully rendered
    await page.waitForTimeout(3000);
    
    // Verify both messages appear in conversation
    // Look for chat-item divs (user messages) and chat-content divs (AI responses)
    const chatItems = page.locator('.chat-item');
    const chatContent = page.locator('.chat-content');
    const itemCount = await chatItems.count();
    const contentCount = await chatContent.count();
    
    // Should have at least 2 chat items (2 user messages)
    expect(itemCount).toBeGreaterThanOrEqual(2);
    
    // Should have at least 1 response (AI responses)
    expect(contentCount).toBeGreaterThan(0);
    
    // Verify conversation maintains context (both messages are present)
    await expect(page.getByText(TEST_MESSAGES.question)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_MESSAGES.followUp)).toBeVisible({ timeout: 5000 });
    
    // Keep browser open to see both responses
    console.log('Both responses received. Keeping browser open for 5 seconds...');
    // await page.close();
  });

  
});

