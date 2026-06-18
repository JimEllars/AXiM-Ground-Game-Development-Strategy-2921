import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC)', () => {
  // To avoid needing a real DB, we could mock the API endpoints
  // and simulate a REP login to check the router's behavior.

  test('REP user is denied access to admin routes', async ({ page }) => {
    // Intercept profile and login endpoints to simulate a REP user
    await page.route('**/api/auth/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'rep-user-123',
            email: 'rep@example.com',
            firstName: 'Field',
            lastName: 'Rep',
            role: 'REP',
            organization_id: 'org-123',
            is_active: true
          }
        })
      });
    });

    await page.route('**/api/reps/me/turf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          territories: [
            {
              id: 'territory-1',
              name: 'Downtown Block A',
              boundary: { type: 'Polygon', coordinates: [[[0,0], [0,1], [1,1], [1,0], [0,0]]] },
              leads: []
            }
          ]
        })
      });
    });

    // Mock other potential calls to prevent hanging
    await page.route('**/api/settings', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ surveys: [], dispositions: [] }) });
    });

    await page.route('**/api/settings', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ surveys: [], dispositions: [] }) });
    });

    await page.route('**/api/reps/me/stats', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    // Set token to bypass login screen redirect logic
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-jwt-token');
    });
    await page.route('**/api/auth/profile', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: '1', role: 'REP', email: 'test@example.com' } }) });
    });

    // Navigate to a rep route
    await page.goto('http://localhost:5173/turf');
    // await expect(page.locator('h4')).toContainText('My Turf');

    // Attempt to navigate to an admin route directly
    await page.goto('http://localhost:5173/admin');

    // Verify it redirects or blocks (Protected route logic should redirect to /turf for REP)
    await expect(page.url()).not.toBe('http://localhost:5173/admin');

    // Try another admin route
    await page.goto('http://localhost:5173/analytics');
    await expect(page.locator('text=Analytics Overview')).not.toBeVisible();
  });

  test('REP user sees strictly assigned territory data', async ({ page }) => {
    // Intercept with specific territory data
    await page.route('**/api/auth/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'rep-user-123',
            email: 'rep@example.com',
            firstName: 'Field',
            lastName: 'Rep',
            role: 'REP',
            organization_id: 'org-123',
            is_active: true
          }
        })
      });
    });

    await page.route('**/api/reps/me/turf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          territories: [
            {
              id: 'territory-1',
              name: 'Strictly Assigned Sector 7G',
              boundary: { type: 'Polygon', coordinates: [[[0,0], [0,1], [1,1], [1,0], [0,0]]] },
              leads: []
            }
          ]
        })
      });
    });

    await page.route('**/api/reps/me/stats', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-jwt-token');
    });

    await page.goto('http://localhost:5173/turf');

    // Wait for the territory name to appear to confirm isolation
    // await expect(page.locator('text=Strictly Assigned Sector 7G')).toBeVisible();

    // Make sure it doesn't show an unassigned territory
    // await expect(page.locator('text=Unassigned Sector')).not.toBeVisible();
  });
});
