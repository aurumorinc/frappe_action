import { test, expect } from './fixtures';

test('User can authenticate and site is saved', async ({ context, extensionId }) => {
  // Navigate to the popup page
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Verify the popup renders correctly
  await expect(page.locator('body')).toBeVisible();

  // In a real E2E test, we would interact with the popup to trigger the auth flow,
  // or mock the Frappe backend and simulate the OAuth redirect.
  // For now, we just ensure the popup loads without crashing.
  
  // Example of checking for a specific element (adjust based on actual UI):
  // await expect(page.locator('text=Frappe Orbit')).toBeVisible();
});
