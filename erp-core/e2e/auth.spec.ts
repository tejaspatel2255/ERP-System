import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="text"]', 'wronguser@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Expect some error message to appear (depends on backend response)
    // Since we are black-box testing, we just check for the UI reaction
    await expect(page.locator('div[style*="background: rgb(254, 242, 242)"]')).toBeVisible();
  });

  test('navigation to register page works', async ({ page }) => {
    await page.goto('/auth/login');
    await page.click('text=Register');
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});
