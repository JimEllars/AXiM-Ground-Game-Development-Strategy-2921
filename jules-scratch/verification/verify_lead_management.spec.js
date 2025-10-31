
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  test.setTimeout(60000); // Set timeout to 60 seconds
  await page.goto('http://localhost:5173/login');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/AXiM Ground Game/);

  // Check if already logged in
  if (await page.locator('text=Dashboard').isVisible()) {
    // Already logged in, navigate to leads
    await page.goto('http://localhost:5173/leads');
  } else {
    // Not logged in, perform login
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('admin@axim.com');
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill('password');
    const getStarted = page.getByRole('button', { name: 'Sign In' });
    await getStarted.click();
    await expect(page).toHaveURL(/.*./);
  }

  // Navigate to lead management and take screenshot
  await page.goto('http://localhost:5173/leads');
  await page.waitForSelector('text=Lead Management');
  await page.screenshot({ path: 'jules-scratch/verification/verification.png' });

  // Logout
  const logoutButton = page.getByRole('button', { name: 'Logout' });
  await logoutButton.click();
  await expect(page).toHaveURL(/.*login/);
});
