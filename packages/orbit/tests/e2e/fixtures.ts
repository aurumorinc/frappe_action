import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    // WXT outputs the built extension here
    const pathToExtension = path.join(__dirname, '../../.output/chrome-mv3');
    
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions only work in headful mode
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // For Manifest V3, we get the extension ID from the background service worker
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
