
import { test, expect } from '@playwright/test';

test('login and view leads', async ({ page }) => {
  await page.goto('http://localhost:5173/login');

  // Fill in login form
  await page.fill('input[name="email"]', 'admin@axim.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Wait for post-login navigation
  await page.waitForURL('**/dashboard');

  // Try to go directly to leads
  await page.goto('http://localhost:5173/leads');

  // Verify elements on Leads page
  // The header should be visible now that the crash is fixed
  await expect(page.locator('h4')).toContainText('Lead Management');

  // Take screenshot
  await page.screenshot({ path: 'jules-scratch/leads_page.png' });
});
