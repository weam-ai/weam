import { chromium, FullConfig } from '@playwright/test';
import { TEST_USERS, ROUTES, BASE_URL } from './test-data';

/**
 * Global setup to authenticate once and save session state
 * This runs before all tests to establish a logged-in session
 */
async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  
  try {
    console.log('Starting global setup: Performing login...');
    
    // Navigate to login page using full URL
    const loginUrl = `${BASE_URL}${ROUTES.login}`;
    console.log(`Navigating to: ${loginUrl}`);
    await page.goto(loginUrl);
    
    // Fill email field
    const emailInput = page.getByLabel('Email address', { exact: false });
    await emailInput.fill(TEST_USERS.valid.email);
    
    // Fill password field
    const passwordInput = page.getByLabel('Password', { exact: false });
    await passwordInput.fill(TEST_USERS.valid.password);
    
    // Click Sign In button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait for navigation after login
    const mainUrl = `${BASE_URL}${ROUTES.main}`;
    await page.waitForURL(mainUrl, { timeout: 10000 });
    
    // Verify login was successful by checking for authenticated elements
    const authenticatedIndicator = page.getByRole('combobox').or(
      page.locator('text=Settings').or(
        page.locator('[class*="sidebar"]')
      )
    );
    await authenticatedIndicator.first().waitFor({ timeout: 10000 });
    
    // Save authentication state to test-results folder (already in .gitignore)
    // Path is relative to project root - Playwright will create the directory if needed
    const storageStatePath = 'test-results/.auth/storage-state.json';
    await context.storageState({ path: storageStatePath });
    
    console.log('Global setup completed: Authentication state saved to', storageStatePath);
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

