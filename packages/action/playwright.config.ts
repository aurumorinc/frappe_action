import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run sequentially to avoid port/profile conflicts with persistent contexts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Must be 1 for persistent contexts
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
});
