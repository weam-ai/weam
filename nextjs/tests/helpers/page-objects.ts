import { Page, Locator, expect } from '@playwright/test';
import { ROUTES } from './test-data';

/**
 * Page Object Models for common components and pages
 */

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email address', { exact: false });
    this.passwordInput = page.getByLabel('Password', { exact: false });
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    this.signUpLink = page.getByRole('link', { name: /sign up/i });
    this.heading = page.getByRole('heading', { name: /sign in/i });
  }

  async goto() {
    await this.page.goto(ROUTES.login);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.signInButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}

export class ChatPage {
  readonly page: Page;
  readonly modelSelector: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly messageList: Locator;

  constructor(page: Page) {
    this.page = page;
    // Model selector - uses combobox role from PopoverTrigger
    this.modelSelector = page.getByRole('combobox').or(
      page.locator('button[role="combobox"]')
    );
    // Chat input - has id="textarea" and specific placeholder
    // Use placeholder as primary selector since it's more reliable
    this.chatInput = page.getByPlaceholder(/chat with weam/i).or(
      page.locator('textarea#textarea')
    );
    // Send button - look for submit button or arrow icon
    this.sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has(svg)').last() // Usually the send button has an icon
    );
    // Message list container
    this.messageList = page.locator('[data-testid="message-list"]').or(
      page.locator('.conversation').or(page.locator('[class*="message"]'))
    );
  }

  async goto() {
    await this.page.goto(ROUTES.main);
    // Wait for chat to be ready
    await this.page.waitForLoadState('networkidle');
  }

  async openModelSelector() {
    await this.modelSelector.click();
    // Wait for model popover to appear
    await this.page.waitForTimeout(500);
  }

  async selectModel(modelName: string) {
    await this.openModelSelector();
    // Find and click the model in the popover
    const modelOption = this.page.getByText(modelName, { exact: false }).first();
    await modelOption.click();
    // Wait for selection to complete
    await this.page.waitForTimeout(300);
  }

  async selectGeminiModel() {
    // Try to find any Gemini model
    await this.openModelSelector();
    const geminiModel = this.page.getByText(/gemini/i).first();
    await geminiModel.click();
    await this.page.waitForTimeout(300);
  }

  async sendMessage(message: string) {
    // Wait for input to be enabled
    await this.page.waitForSelector('textarea#textarea:not([disabled])', { timeout: 10000 });
    await this.chatInput.fill(message);
    // Try clicking send button first, fallback to Enter key
    if (await this.sendButton.isVisible().catch(() => false)) {
      await this.sendButton.click();
    } else {
      await this.chatInput.press('Enter');
    }
  }

  async waitForResponse(timeout: number = 30000) {
    // Wait for user message to appear first
    await this.page.waitForSelector('.chat-item', { timeout: 10000 });
    // Wait for AI response to start appearing
    await this.page.waitForSelector('.chat-content, [class*="loading"], [class*="stream"]', { 
      timeout 
    }).catch(() => {
      // If no response indicator found, just wait a bit
      return this.page.waitForTimeout(5000);
    });
  }

  async waitForInputReady(timeout: number = 30000) {
    // Wait for input to be enabled again after sending a message
    await this.page.waitForFunction(
      () => {
        const textarea = document.querySelector('textarea#textarea') as HTMLTextAreaElement | null;
        return textarea !== null && !textarea.disabled;
      },
      { timeout }
    );
  }


  async attachFile(filePath: string) {
    // Find the plus button - it's in a flex container with class "flex items-center"
    // The button has type="button" and contains a Plus icon (SVG)
    // It can be disabled when enhancing, so we need to wait for it to be enabled
    
    // First, wait for the textarea to be present (ensures chat input is loaded)
    const textarea = this.page.locator('textarea#textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    
    // Try multiple approaches to find the plus button
    let plusButton: Locator | null = null;
    
    // Approach 1: Find via flex container near textarea
    try {
      const mainContainer = textarea.locator('..').locator('..');
      const buttonsContainer = mainContainer.locator('div.flex.items-center').first();
      await expect(buttonsContainer).toBeVisible({ timeout: 3000 });
      const candidateButton = buttonsContainer.locator('button[type="button"]').first();
      const isVisible = await candidateButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        plusButton = candidateButton;
      }
    } catch (e) {
      // Continue to next approach
    }
    
    // Approach 2: Fallback - find any button[type="button"] with SVG near textarea
    if (!plusButton || !(await plusButton.isVisible({ timeout: 1000 }).catch(() => false))) {
      const textareaParent = textarea.locator('..').locator('..');
      const candidateButton = textareaParent.locator('button[type="button"]')
        .filter({ has: this.page.locator('svg') })
        .first();
      const isVisible = await candidateButton.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        plusButton = candidateButton;
      }
    }
    
    // Approach 3: Last resort - find any enabled button with SVG
    if (!plusButton || !(await plusButton.isVisible({ timeout: 1000 }).catch(() => false))) {
      plusButton = this.page.locator('button[type="button"]:not([disabled])')
        .filter({ has: this.page.locator('svg') })
        .first();
    }
    
    // Ensure we have a valid button
    if (!plusButton) {
      throw new Error('Could not find plus button for file upload');
    }
    
    // Wait for button to be visible and enabled
    await expect(plusButton).toBeVisible({ timeout: 10000 });
    
    // Wait for button to be enabled (it might be disabled during loading)
    let isEnabled = await plusButton.isEnabled().catch(() => false);
    if (!isEnabled) {
      // Wait for enhancing to finish (max 10 seconds)
      await this.page.waitForFunction(
        () => {
          const buttons = Array.from(document.querySelectorAll('button[type="button"]'));
          return buttons.some((btn) => {
            const button = btn as HTMLButtonElement;
            return !button.disabled && button.querySelector('svg');
          });
        },
        { timeout: 10000 }
      ).catch(() => {
        // If still not enabled, wait a bit more
        return this.page.waitForTimeout(2000);
      });
    }
    
    // Scroll button into view and click it
    await plusButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    
    // Try clicking with force option if regular click fails
    try {
      await plusButton.click({ timeout: 10000 });
    } catch (e) {
      // If regular click fails, try force click
      await plusButton.click({ force: true, timeout: 5000 });
    }
    await this.page.waitForTimeout(1000);
    
    // Wait for menu to appear - look for "Link Files" text (more reliable than class selector)
    const attachOption = this.page.getByText('Link Files', { exact: false });
    await expect(attachOption).toBeVisible({ timeout: 5000 });
    
    // Find the file input BEFORE clicking (so we can set files without opening native dialog)
    const fileInput = this.page.locator('input[type="file"]');
    
    // Instead of clicking "Link Files" which opens native dialog,
    // directly set the file on the input - this triggers onChange without opening dialog
    await fileInput.setInputFiles(filePath);
    
    // Now close the menu by clicking outside or waiting for it to auto-close
    // The menu should close automatically, but if not, we can click outside
    await this.page.waitForTimeout(500);
    
    // Check if menu is still open - if so, click outside to close it
    const isMenuVisible = await attachOption.isVisible({ timeout: 1000 }).catch(() => false);
    if (isMenuVisible) {
      // Click outside the menu to close it (click on the textarea)
      const textarea = this.page.locator('textarea#textarea');
      await textarea.click({ force: true });
      await this.page.waitForTimeout(500);
    }
    
    // Verify menu is closed
    await expect(attachOption).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // If still visible, wait a bit more
      return this.page.waitForTimeout(1000);
    });
    
    // Wait for file to be uploaded (check for file loader or attached files indicator)
    await this.page.waitForTimeout(2000);
    
    // Wait for file to appear in the attached files section
    await this.page.waitForSelector('.attached-files', { timeout: 15000 }).catch(() => {
      // File might still be uploading, wait a bit more
      return this.page.waitForTimeout(3000);
    });
  }

  async waitForFileUpload(timeout: number = 30000) {
    // Wait for file loader to disappear (file upload complete)
    await this.page.waitForFunction(
      () => {
        const loader = document.querySelector('[class*="loader"], [class*="loading"]');
        return loader === null || !loader.classList.toString().includes('file');
      },
      { timeout }
    ).catch(() => {
      // If loader check fails, just wait a bit
      return this.page.waitForTimeout(2000);
    });
  }
}

export class MembersSettingsPage {
  readonly page: Page;
  readonly inviteButton: Locator;
  readonly membersTable: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inviteButton = page.getByRole('button', { name: /invite/i });
    this.membersTable = page.locator('table').or(
      page.locator('[data-testid="members-table"]')
    );
    this.searchInput = page.getByPlaceholder(/search.*member/i);
  }

  async goto() {
    await this.page.goto(ROUTES.settingsMembers);
    await this.page.waitForLoadState('networkidle');
  }
}

export class InviteMemberModal {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly roleSelect: Locator;
  readonly sendInvitationsButton: Locator;
  readonly cancelButton: Locator;
  readonly successMessage: Locator;
  readonly finishButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Email chip input - ChipInput from material-ui-chip-input
    // The input is typically inside a div with class containing "chip" or "input"
    this.emailInput = page.locator('input[type="text"]').filter({ 
      has: page.locator('..').filter({ hasText: /email|address/i })
    }).or(
      page.locator('.MuiChipInput-root input').or(
        page.locator('input').filter({ hasText: /type and press/i }).first()
      )
    );
    // Role select dropdown - react-select component
    this.roleSelect = page.locator('.react-select-container').or(
      page.locator('[class*="react-select"]').first()
    );
    this.sendInvitationsButton = page.getByRole('button', { name: /send invitations/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.successMessage = page.getByText(/invitations successfully sent/i);
    this.finishButton = page.getByRole('button', { name: /finish/i });
  }

  async addEmail(email: string) {
    // Find the actual input element (ChipInput)
    const input = this.page.locator('input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 5000 });
    // Type email with comma at the end to trigger chip creation
    await input.type(email);
    await input.press('Tab');
    await this.page.waitForTimeout(1500);
  }

  async addMultipleEmails(emails: string[]) {
    for (const email of emails) {
      await this.addEmail(email);
    }
  }

  async selectRole(roleName: string) {
    // For react-select, scope to modal dialog to avoid matching other selects
    const modal = this.page.locator('[role="dialog"]');
    
    // Find the role select container within the modal
    // The label "Role" and the select are in the same parent div
    const roleLabel = modal.getByText('Role', { exact: false });
    const container = roleLabel.locator('..').locator('.react-select-container').first();
    
    await expect(container).toBeVisible({ timeout: 5000 });
    
    // Then click the control inside the container
    const control = container.locator('.react-select__control');
    await expect(control).toBeVisible({ timeout: 5000 });
    await control.click();
    await this.page.waitForTimeout(1000);
    
    // Wait for menu to open and be visible
    const menu = this.page.locator('.react-select__menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    await this.page.waitForTimeout(500);
    
    // Then click the option within the menu
    const option = menu.locator('.react-select__option').filter({ 
      hasText: new RegExp(roleName, 'i')
    }).first();
    
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await this.page.waitForTimeout(1000);
  }

  async submit() {
    await this.sendInvitationsButton.click();
  }

  async waitForSuccess() {
    await this.successMessage.waitFor({ timeout: 30000 });
  }

  async finish() {
    await this.finishButton.click();
    // Wait for modal to close
    await this.page.waitForTimeout(500);
  }
}

