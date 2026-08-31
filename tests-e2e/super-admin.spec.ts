import { test, expect } from '@playwright/test';
import { injectMockSession } from './test-helpers';

test.describe('Platform Super Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockSession(page, 'SUPER_ADMIN');
    await page.goto('/');
  });

  test('should render Super Admin Dashboard successfully', async ({ page }) => {
    await expect(page.locator('text=/Platform Administration|Super Admin Dashboard/i').first()).toBeVisible({ timeout: 10000 });
  });
});
