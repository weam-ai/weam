import { Page, expect } from '@playwright/test';
import { ROUTES, TEST_USERS } from './test-data';

/**
 * Authentication helper functions for Playwright tests
 */

/**
 * Login with valid credentials
 * @param page - Playwright page object
 * @param email - Email address (defaults to test user)
 * @param password - Password (defaults to test user password)
 */
export async function login(
  page: Page,
  email: string = TEST_USERS.valid.email,
  password: string = TEST_USERS.valid.password
): Promise<void> {
  await page.goto(ROUTES.login);
  
  // Fill email field
  const emailInput = page.getByLabel('Email address', { exact: false });
  await emailInput.fill(email);
  
  // Fill password field
  const passwordInput = page.getByLabel('Password', { exact: false });
  await passwordInput.fill(password);
  
  // Click Sign In button
  const signInButton = page.getByRole('button', { name: /sign in/i });
  await signInButton.click();
  
  // Wait for navigation after login
  await page.waitForURL(ROUTES.main, { timeout: 10000 });
}

/**
 * Logout user
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button/link - adjust selector based on actual UI
  // This is a placeholder - update based on actual logout implementation
  // For now, we'll just clear cookies/session storage
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(ROUTES.login);
}

/**
 * Check if user is logged in
 * @param page - Playwright page object
 * @returns true if user appears to be logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for authenticated UI elements
  // Adjust selectors based on actual UI
  const authenticatedIndicators = [
    page.locator('text=Settings'),
    page.locator('text=Profile'),
    page.getByRole('button', { name: /model/i }), // Model selector in header
  ];
  
  for (const indicator of authenticatedIndicators) {
    if (await indicator.isVisible().catch(() => false)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Navigate to login page and verify it loads
 * @param page - Playwright page object
 */
export async function goToLoginPage(page: Page): Promise<void> {
  await page.goto(ROUTES.login);
  await expect(page).toHaveURL(ROUTES.login);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
}

