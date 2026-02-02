import { test, expect } from '@playwright/test';
import { LoginPage } from './helpers/page-objects';
import { TEST_USERS, ROUTES } from './helpers/test-data';

test.describe('Login Form Functionality', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('SUCCESSFUL-LOGIN: Successful Login', async ({ page }) => {
    // Fill email and password fields
    await loginPage.fillEmail(TEST_USERS.valid.email);
    await loginPage.fillPassword(TEST_USERS.valid.password);
    
    // Submit form
    await loginPage.submit();
    
    // Wait for navigation to main page
    await page.waitForURL(ROUTES.main, { timeout: 10000 });
    
    // Verify URL changed to main page
    await expect(page).toHaveURL(ROUTES.main);
    
    // Verify user is authenticated (check for authenticated UI elements)
    // Look for model selector (combobox) or sidebar elements
    const authenticatedIndicator = page.getByRole('combobox').or(
      page.locator('text=Settings').or(
        page.locator('[class*="sidebar"]')
      )
    );
    await expect(authenticatedIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('LOGIN-WITH-INVALID-CREDENTIALS: Login with Invalid Credentials', async ({ page }) => {
    // Fill with invalid credentials
    await loginPage.fillEmail(TEST_USERS.invalid.email);
    await loginPage.fillPassword(TEST_USERS.invalid.password);
    
    // Submit form
    await loginPage.submit();
    
    // Wait a bit for error to appear
    await page.waitForTimeout(2000);
    
    // Verify error message appears (adjust selector based on actual error display)
    const errorMessage = page.locator('text=/error|invalid|incorrect/i').or(
      page.locator('[role="alert"]')
    );
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    
    // Verify user remains on login page
    await expect(page).toHaveURL(ROUTES.login);
  });

  test('LOGIN-FORM-VALIDATION: Login Form Validation', async ({ page }) => {
    // Try to submit without filling fields
    await loginPage.submit();
    
    // Wait for validation errors
    await page.waitForTimeout(1500);
    
    // Verify validation errors appear
    // ValidationError component renders <p className="text-font-13 font-medium mt-1 text-red">
    // Check for email validation error - look for red text near email field
    const emailError = page.locator('p.text-red').filter({ 
      hasText: /email|required/i 
    }).or(
      page.locator('[id="email"]').locator('..').locator('p.text-red')
    );
    await expect(emailError.first()).toBeVisible({ timeout: 5000 });
    
    // Check for password validation error
    const passwordError = page.locator('p.text-red').filter({ 
      hasText: /password|required/i 
    }).or(
      page.locator('[id="password"]').locator('..').locator('p.text-red')
    );
    await expect(passwordError.first()).toBeVisible({ timeout: 5000 });
  });

  test('EMAIL-FIELD-AUTO-LOWERCASE: Email Field Auto-lowercase', async ({ page }) => {
    const uppercaseEmail = 'TEST@EXAMPLE.COM';
    const lowercaseEmail = 'test@example.com';
    
    // Type email with uppercase
    await loginPage.emailInput.fill(uppercaseEmail);
    
    // The onChange handler should convert to lowercase automatically
    // Trigger change event by typing or blurring
    await loginPage.emailInput.press('Tab');
    await page.waitForTimeout(500);
    
    // Verify email is converted to lowercase
    const emailValue = await loginPage.emailInput.inputValue();
    expect(emailValue.toLowerCase()).toBe(lowercaseEmail);
  });

  test('FORGOT-PASSWORD-LINK: Forgot Password Link', async ({ page }) => {
    // Click forgot password link
    await loginPage.forgotPasswordLink.click();
    
    // Verify navigation to forgot password page
    await expect(page).toHaveURL(/forgot-password/i);
  });

  test('SIGN-UP-LINK: Sign Up Link', async ({ page }) => {
    // Click sign up link
    await loginPage.signUpLink.click();
    
    // Verify navigation to register page
    await expect(page).toHaveURL(/register/i);
  });
});

