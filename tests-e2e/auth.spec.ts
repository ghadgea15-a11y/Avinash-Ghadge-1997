import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display the login page correctly', async ({ page }) => {
    // Navigate to the root URL
    await page.goto('/');

    // Check that the page title is somewhat relevant
    await expect(page).toHaveTitle(/Log Sheet Muster|Login/i);

    // Click Login on the landing page
    const loginButton = page.getByRole('button', { name: /Login to Web App|System Login/i }).first();
    await loginButton.click();

    // Verify Company Code UI elements are present
    const companyCodeInput = page.getByPlaceholder(/ACME-CORP/i).first();
    const continueButton = page.getByRole('button', { name: /Continue/i });

    await expect(companyCodeInput).toBeVisible();
    await expect(continueButton).toBeVisible();
  });

  test('should show validation errors on empty submission', async ({ page }) => {
    await page.goto('/');
    
    // Click Login on the landing page
    const loginButton = page.getByRole('button', { name: /Login to Web App|System Login/i }).first();
    await loginButton.click();

    // The Company Code step requires a valid company in Firestore.
    // For UI E2E test, we can use the Platform Admin bypass from the menu.
    // Open the dropdown menu (using the lucide-menu icon button)
    await page.locator('button:has(svg.lucide-menu)').first().click();
    
    // Click Platform Admin Login
    const platformAdminBtn = page.getByRole('button', { name: /Platform Admin Login/i }).first();
    await platformAdminBtn.click();

    // Now we are on CREDENTIALS step. Click Sign In with empty fields.
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Check for validation messages
    const errorMessage = page.locator('text=/Please enter your Email address/i').first();
    await expect(errorMessage).toBeVisible();
  });
});
