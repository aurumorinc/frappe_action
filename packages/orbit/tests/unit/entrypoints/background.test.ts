import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import * as authStorage from '../../../src/services/auth';

// Mock the background script dependencies
vi.mock('../../../src/services/engine', () => {
  return {
    Engine: class {
      getCurrentNode = vi.fn().mockReturnValue(null);
      advance = vi.fn();
      scrapedData = { test: 'data' };
    }
  };
});

vi.mock('../../../src/services/auth', () => ({
  saveSite: vi.fn(),
  getActiveSite: vi.fn()
}));

describe('background', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();
  });

  it('should handle START_OAUTH_FLOW and save token', async () => {
    // Mock fetch for token exchange
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600
      })
    });

    // Mock launchWebAuthFlow
    fakeBrowser.identity.launchWebAuthFlow = vi.fn().mockImplementation((options, callback) => {
      // Ensure lastError is undefined
      if (global.chrome && global.chrome.runtime) {
        delete (global.chrome.runtime as any).lastError;
      }
      callback('https://extension.chromiumapp.org/?code=mock_auth_code');
    });
    fakeBrowser.identity.getRedirectURL = vi.fn().mockReturnValue('https://extension.chromiumapp.org/');

    // We need to import the background script to register the listener
    // Since it's a module with side effects, we import it dynamically
    const bg = await import('../../../entrypoints/background');
    bg.default.main();

    // Simulate sending a message by calling the listener directly
    // fakeBrowser.runtime.onMessage.addListener registers listeners internally
    // We can trigger it using fakeBrowser.runtime.sendMessage, but we need to handle the async response
    
    // Mock the sendResponse function
    const sendResponse = vi.fn();
    
    // We need to extract the listener that was registered
    // Since fakeBrowser doesn't expose the listeners easily, let's mock chrome globally
    const mockListener = vi.fn();
    global.chrome = {
      ...global.chrome,
      runtime: {
        ...global.chrome?.runtime,
        onMessage: {
          addListener: vi.fn((fn) => {
            mockListener.mockImplementation(fn);
          })
        }
      },
      action: {
        onClicked: {
          addListener: vi.fn()
        }
      }
    } as any;

    // Re-import to register with our mock
    vi.resetModules();
    const bg2 = await import('../../../entrypoints/background');
    bg2.default.main();

    const response = await new Promise((resolve) => {
      mockListener(
        { type: 'START_OAUTH_FLOW', payload: { siteUrl: 'https://example.com', clientId: 'client123' } },
        {},
        resolve
      );
    });

    // Verify the response
    expect(response).toEqual({ success: true });

    // Verify saveSite was called
    expect(authStorage.saveSite).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.com',
      clientId: 'client123',
      accessToken: 'mock_access_token',
      isActive: true
    }));
  });

  it('should handle START_ACTION and submit full ToDo doc', async () => {
    // Mock fetch for submit
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'success' })
    });

    // Mock getActiveSite
    vi.spyOn(authStorage, 'getActiveSite').mockResolvedValue({
      url: 'https://example.com',
      accessToken: 'mock_token',
      refreshToken: 'mock_refresh',
      clientId: 'client123',
      id: 'site1',
      isActive: true,
      expiresAt: Date.now() + 3600000
    });

    const mockListener = vi.fn();
    global.chrome = {
      ...global.chrome,
      runtime: {
        ...global.chrome?.runtime,
        onMessage: {
          addListener: vi.fn((fn) => {
            mockListener.mockImplementation(fn);
          })
        }
      },
      action: {
        onClicked: {
          addListener: vi.fn()
        }
      }
    } as any;

    vi.resetModules();
    const bg = await import('../../../entrypoints/background');
    bg.default.main();

    const mockTodo = { name: 'TODO-123', description: 'Test', status: 'Open' };
    const mockGraph = { nodes: [], edges: [] };

    // Send START_ACTION
    await new Promise((resolve) => {
      mockListener(
        { type: 'START_ACTION', payload: { todo: mockTodo, compiled_json: mockGraph } },
        {},
        resolve
      );
    });

    // Since the mock engine returns null for getCurrentNode, it will immediately complete the action
    // and call submit. We need to wait a tick for the async fetch to happen.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api/method/frappe_orbit.todo.submit',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"TODO-123"')
      })
    );
  });
});
