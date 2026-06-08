import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('getText node', () => {
  test.beforeEach(async ({ page }) => {
    const fixturePath = path.resolve(__dirname, '../fixtures/target-page.html');
    await page.goto(`file://${fixturePath}`);
  });

  test.skip('should extract text from a single element', async ({ page }) => {
    // This test needs to be rewritten to test the background service worker
    // since getText is now a background node using CDP.
  });

  test.skip('should extract text from multiple elements', async ({ page }) => {
  });

  test.skip('should return error if element not found', async ({ page }) => {
  });
});
