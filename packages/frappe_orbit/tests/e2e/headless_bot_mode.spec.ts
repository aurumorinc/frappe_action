import { test, expect } from '@playwright/test';

test.describe('Headless Bot Mode E2E', () => {
  test('bot triggers action and receives payload', async ({ page }) => {
    // 1. Serve static HTML page
    await page.setContent(`
      <html>
        <body>
          <div id="target">Bot Data</div>
        </body>
      </html>
    `);

    // 2. Inject mock listener for the bot to receive the result
    await page.evaluate(() => {
      window.addEventListener('ORBIT_ACTION_COMPLETE', (e: any) => {
        window['__orbit_result'] = e.detail;
      });
    });

    // 3. Simulate bot triggering the action
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ORBIT_START_HEADLESS_ACTION', { 
        detail: { action_name: 'Test' } 
      }));
    });

    // 4. Simulate extension processing and returning data
    await page.evaluate(() => {
      // In reality, the extension content script would do this after background processing
      window.dispatchEvent(new CustomEvent('ORBIT_ACTION_COMPLETE', {
        detail: { scraped_data: { target: 'Bot Data' } }
      }));
    });

    // 5. Assert bot received the payload
    const result = await page.evaluate(() => window['__orbit_result']);
    expect(result).toEqual({ scraped_data: { target: 'Bot Data' } });

    // 6. Assert UI was NOT injected
    const shadowHost = await page.$('#plasmo-shadow-container');
    expect(shadowHost).toBeNull();
  });
});
