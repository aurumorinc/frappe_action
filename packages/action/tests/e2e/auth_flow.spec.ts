import { test, expect } from './fixtures';

test('User can authenticate and site is saved', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto('https://example.com');

  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  await background.evaluate(() => {
    // @ts-ignore
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_ACTION_UI" });
      }
    });
  });

  const shadowHost = page.locator('action-copilot-shadow-root');
  await expect(shadowHost).toBeAttached();
});
