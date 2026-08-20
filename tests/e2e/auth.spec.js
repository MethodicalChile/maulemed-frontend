import { test, expect } from '@playwright/test';

test('login flow works', async ({ page }) => {
  await page.goto('/login');

  // Assuming standard inputs based on project structure
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'JAge.0210.');
  
  // Submit the form (adjust selector based on actual submit button)
  await page.click('button[type="submit"]');

  // Verify redirection to dashboard
  await expect(page).toHaveURL(/.*dashboard/);
});
