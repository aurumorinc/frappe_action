import { test, expect } from './fixtures';

test.describe('Todo Model E2E', () => {
  test.beforeEach(async ({ page, context }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    // Mock the sites storage via background service worker
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await background.evaluate(() => {
      return new Promise((resolve) => {
        const sites = [
          { url: 'https://test-site.frappe.cloud', accessToken: 'fake-token' }
        ];
        chrome.storage.local.set({
          'orbit_sites': sites,
          'local:orbit_sites': sites,
          'orbit_sites_json': JSON.stringify(sites),
          'local:orbit_sites_json': JSON.stringify(sites)
        }, () => resolve(undefined));
      });
    });

    // Navigate to a real page where content scripts can run
    await page.goto('https://example.com');
  });

  test('Model Trigger and Base Layout', async ({ page, context }) => {
    // Mock the API response
    await page.route('**/api/resource/ToDo*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: [] })
      });
    });

    // Mock the action get API
    await page.route('**/api/method/frappe_orbit.action.get*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: { compiled_json: '{"nodes":[],"edges":[]}' } })
      });
    });

    // Trigger the UI
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_ORBIT_UI' });
      }
    });

    // Wait for the shadow root to appear
    const shadowHost = page.locator('orbit-copilot-shadow-root');
    await expect(shadowHost).toBeAttached();

    // Check base layout
    const todoContainer = shadowHost.locator('.todo-modal');
    await expect(todoContainer).toBeVisible();
    
    // Check heading
    await expect(shadowHost.locator('.todo-title').filter({ hasText: 'Todos' })).toBeVisible();
  });

  test('Content and Limits', async ({ page, context }) => {
    // Generate 15 mock todos
    const mockTodos = Array.from({ length: 15 }, (_, i) => ({
      name: `TODO-${i + 1}`,
      description: `Test Todo ${i + 1}`,
      status: 'Open',
      action: 'Test Action'
    }));

    await page.route('**/api/resource/ToDo*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: mockTodos })
      });
    });

    await page.route('**/api/method/frappe_orbit.action.get*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: { compiled_json: '{"nodes":[],"edges":[]}' } })
      });
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_ORBIT_UI' });
      }
    });

    const shadowHost = page.locator('orbit-copilot-shadow-root');
    await expect(shadowHost).toBeAttached();

    // Verify progress text
    await expect(shadowHost.locator('text=0/15 todos completed')).toBeVisible();

    // Verify only 9 items are rendered
    const todoItems = shadowHost.locator('.todo-item.group');
    await expect(todoItems).toHaveCount(9);
  });

  test('Nested Action Nodes', async ({ page, context }) => {
    // Mock todos with dependencies (nested action nodes)
    const mockTodos = [
      { name: 'TODO-1', description: 'Parent Todo', status: 'Open', action: 'Test Action' },
      { name: 'TODO-2', description: 'Child Todo', status: 'Open', depends_on: 'TODO-1', action: 'Test Action' }
    ];

    await page.route('**/api/resource/ToDo*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: mockTodos })
      });
    });

    await page.route('**/api/method/frappe_orbit.action.get*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: { compiled_json: '{"nodes":[],"edges":[]}' } })
      });
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_ORBIT_UI' });
      }
    });

    const shadowHost = page.locator('orbit-copilot-shadow-root');
    await expect(shadowHost).toBeAttached();

    // Verify both are rendered
    const todoItems = shadowHost.locator('.todo-item.group');
    await expect(todoItems).toHaveCount(2);

    // Verify the child has the dependent styling (text-ink-gray-4)
    // We check if the second item has the specific class indicating it's dependent
    const childItem = todoItems.nth(1).locator('.text-ink-gray-4');
    await expect(childItem).toBeVisible();
  });

  test('Auto-Update Progress and Manual Completion', async ({ page, context }) => {
    const mockTodos = [
      { name: 'TODO-1', description: 'Test Todo 1', status: 'Open', action: 'Test Action' },
      { name: 'TODO-2', description: 'Test Todo 2', status: 'Open', action: 'Test Action' }
    ];

    await page.route('**/api/resource/ToDo*', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*'
          }
        });
      } else if (route.request().method() === 'PUT') {
        // Mock the PUT request for updating status
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ data: { name: 'TODO-1', status: 'Closed' } })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ data: mockTodos })
        });
      }
    });

    await page.route('**/api/method/frappe_orbit.action.get*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: { compiled_json: '{"nodes":[],"edges":[]}' } })
      });
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_ORBIT_UI' });
      }
    });

    const shadowHost = page.locator('orbit-copilot-shadow-root');
    await expect(shadowHost).toBeAttached();

    // Initial progress
    await expect(shadowHost.locator('text=0/2 todos completed')).toBeVisible();

    // Hover over the first item to reveal the "Mark Completed" button
    const firstItem = shadowHost.locator('.todo-item.group').first();
    await firstItem.hover();

    // Click "Mark Completed" on the first item
    const markCompletedBtn = firstItem.locator('button:has-text("Skip")');
    await markCompletedBtn.click({ force: true });

    // Verify progress updated
    await expect(shadowHost.locator('text=1/2 todos completed')).toBeVisible();

    // Verify the item has line-through styling
    const completedText = firstItem.locator('.line-through');
    await expect(completedText).toBeVisible();
  });

  test('"Mark Completed" Button (Skip All)', async ({ page, context }) => {
    const mockTodos = [
      { name: 'TODO-1', description: 'Test Todo 1', status: 'Open', action: 'Test Action' },
      { name: 'TODO-2', description: 'Test Todo 2', status: 'Open', action: 'Test Action' }
    ];

    await page.route('**/api/resource/ToDo*', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*'
          }
        });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ data: { status: 'Closed' } })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ data: mockTodos })
        });
      }
    });

    await page.route('**/api/method/frappe_orbit.action.get*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: { compiled_json: '{"nodes":[],"edges":[]}' } })
      });
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_ORBIT_UI' });
      }
    });

    const shadowHost = page.locator('orbit-copilot-shadow-root');
    await expect(shadowHost).toBeAttached();

    // Initial progress
    await expect(shadowHost.locator('text=0/2 todos completed')).toBeVisible();

    // Click the global "Mark Completed" button
    const globalMarkCompletedBtn = shadowHost.locator('button:has-text("Mark completed")').first();
    await expect(globalMarkCompletedBtn).toBeVisible();
    await globalMarkCompletedBtn.click();

    // Verify progress updated to 100%
    await expect(shadowHost.locator('text=2/2 todos completed')).toBeVisible();
    
    // Verify all items have line-through styling
    const completedItems = shadowHost.locator('.line-through');
    await expect(completedItems).toHaveCount(2);
  });
});
