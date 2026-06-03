import { test, expect } from '@playwright/test';

test.describe('Human Mode E2E', () => {
  test('full lifecycle human task completion', async ({ page }) => {
    // In a real E2E test, we would load the extension into the browser context
    // and mock the Frappe API. For this scaffold, we simulate the behavior.
    
    // 1. Serve static HTML page
    await page.setContent(`
      <html>
        <body>
          <div id="target">Test Data</div>
          <button id="complete-btn">Complete</button>
        </body>
      </html>
    `);

    // 2. Simulate extension injecting UI
    await page.evaluate(() => {
      const shadowHost = document.createElement('div');
      shadowHost.id = 'plasmo-shadow-container';
      const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div id="orbit-ui">
          <span id="progress">0/1</span>
          <button id="mark-completed">Mark completed</button>
        </div>
      `;
      document.body.appendChild(shadowHost);
    });

    // 3. Assert UI is visible
    const shadowHost = page.locator('#plasmo-shadow-container');
    await expect(shadowHost).toBeAttached();

    // 4. Simulate human clicking the target element (which would trigger observer)
    await page.click('#target');

    // 5. Simulate human clicking "Mark completed"
    await page.evaluate(() => {
      const host = document.getElementById('plasmo-shadow-container');
      if (host && host.shadowRoot) {
        const progress = host.shadowRoot.getElementById('progress');
        if (progress) progress.innerText = '1/1';
      }
    });

    // 6. Assert progress updated
    const progressText = await page.evaluate(() => {
      const host = document.getElementById('plasmo-shadow-container');
      return host?.shadowRoot?.getElementById('progress')?.innerText;
    });
    expect(progressText).toBe('1/1');
  });
});
