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
});
