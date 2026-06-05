import { test, expect } from './fixtures';

test('Extension installs successfully without background errors', async ({ context, extensionId }) => {
  // Wait for the background service worker to be active
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  // Listen for any console errors in the background script
  const errors: string[] = [];
  background.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Give it a moment to initialize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Assert no errors occurred during startup
  expect(errors).toHaveLength(0);

  // Navigate to the popup page
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Verify the popup renders correctly
  // Assuming the popup has a title or some specific element
  await expect(page.locator('body')).toBeVisible();
  
  // You can add more specific assertions here based on your popup's content
  // For example, checking if a specific heading exists:
  // await expect(page.locator('h1')).toHaveText('Frappe Orbit');
});
