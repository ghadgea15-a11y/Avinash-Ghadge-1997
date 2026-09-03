import { test, expect } from '@playwright/test';
import { injectMockSession } from './test-helpers';

test.describe('Company Admin Screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockSession(page, 'COMPANY_ADMIN');
    await page.goto('/');
  });

  test('should load company admin dashboard and verify navigation', async ({ page }) => {
    // Wait for the app to initialize
    await page.waitForSelector('nav', { timeout: 10000 });
    
    // Check if the dashboard or main screen is visible
    // We will just verify it doesn't crash and shows basic shell elements
    await expect(page.locator('nav').first()).toBeVisible();
    
    // Log out page content to debug if needed
    // console.log(await page.content());
    
    // Check that we're not on Super Admin
    await expect(page.locator('text=/Platform Administration/i')).toHaveCount(0);
  });
});
