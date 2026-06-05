import { test, expect } from './fixtures';

test.describe('Orbit Extension E2E', () => {
  test('injects and toggles ToDo UI on action click without errors', async ({ page, context }) => {
    const pageErrors: string[] = [];
    const consoleLogs: any[] = [];
    
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    page.on('console', (msg) => {
      try {
        // Try to parse Pino JSON logs
        const text = msg.text();
        if (text.startsWith('[Orbit]')) {
          // It's our fallback console.log from logger.ts
          consoleLogs.push({ msg: text });
        } else {
          const parsed = JSON.parse(text);
          if (parsed.msg) {
            consoleLogs.push(parsed);
          }
        }
      } catch (e) {
        // Not a JSON log
      }
    });

    // 1. Navigate to a standard webpage where the content script will run
    await page.goto('https://example.com');

    // 2. Get the background service worker
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    // 3. Simulate the exact behavior of your background.ts onClicked listener
    await background.evaluate(() => {
      // @ts-ignore
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_ORBIT_UI" });
        }
      });
    });

    // 4. Verify the Shadow DOM container was injected by content.ts
    const shadowHost = page.locator('orbit-copilot-shadow-root');
    await expect(shadowHost).toBeAttached();

    // 5. Verify the actual Vue component rendered inside the shadow root
    const todoModal = shadowHost.locator('.todo-modal');
    await expect(todoModal).toBeVisible();
    
    const welcomeTitle = shadowHost.locator('.todo-welcome-title');
    await expect(welcomeTitle).toContainText('Welcome to Frappe Orbit');

    // 6. Verify no page errors occurred
    expect(pageErrors).toHaveLength(0);

    // 7. Verify structured logs were captured and no ERROR level logs exist
    // Ensure we mounted successfully
    const mountedLog = consoleLogs.find((l: any) => l.msg && l.msg.includes("UI mounted successfully"));
    expect(mountedLog).toBeDefined();

    // Ensure no ERROR level logs (level 50 in Pino)
    const errorLogs = consoleLogs.filter((l: any) => l.level >= 50 || (l.msg && l.msg.includes("[Orbit] Error")));
    expect(errorLogs).toHaveLength(0);
  });
});
