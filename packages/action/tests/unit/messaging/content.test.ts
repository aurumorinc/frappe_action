import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

vi.mock('wxt/browser', () => ({
  browser: fakeBrowser
}));

vi.mock('#imports', () => ({
  defineContentScript: (config: any) => config,
  createShadowRootUi: vi.fn().mockResolvedValue({
    mount: vi.fn(),
    remove: vi.fn()
  })
}));

vi.mock('../../../src/assets/tailwind.css', () => ({}));

vi.mock('vue', () => ({
  createApp: vi.fn().mockReturnValue({
    mount: vi.fn(),
    unmount: vi.fn()
  })
}));

vi.mock('../../../src/views/ToDoIndex.vue', () => ({
  default: {}
}));

describe('content script', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();
  });

  it('should forward ACTION_CHECK_AUTH_STATUS to background script', async () => {
    const content = await import('../../../src/entrypoints/content');
    
    // Mock window.addEventListener
    const listeners: Record<string, Function[]> = {};
    window.addEventListener = vi.fn((event, cb) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb as Function);
    });

    // Mock window.postMessage
    window.postMessage = vi.fn();

    // Mock browser.runtime.sendMessage
    fakeBrowser.runtime.sendMessage = vi.fn().mockImplementation((msg, cb) => {
      if (msg.type === 'CHECK_AUTH_STATUS') {
        cb({ isAuthorized: true });
      }
    });

    // Initialize content script
    await content.default.main({ onInvalidated: vi.fn() } as any);

    // Trigger message event
    const messageEvent = new MessageEvent('message', {
      data: {
        type: 'ACTION_CHECK_AUTH_STATUS',
        payload: { siteUrl: 'https://example.com' }
      },
      source: window
    });

    listeners['message'].forEach(cb => cb(messageEvent));

    // Verify sendMessage was called
    expect(fakeBrowser.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'CHECK_AUTH_STATUS', payload: { siteUrl: 'https://example.com' } },
      expect.any(Function)
    );

    // Verify postMessage was called with the result
    expect(window.postMessage).toHaveBeenCalledWith(
      { type: 'ACTION_AUTH_STATUS_RESULT', payload: { isAuthorized: true } },
      '*'
    );
  });
});
