const { test, expect } = require('@playwright/test');

test('homepage has title and shows recipes', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Recipes/);

  // Take a screenshot
  await page.screenshot({ path: 'screenshot.png' });
});
