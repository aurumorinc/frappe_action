// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('auth_flow', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();
  });

  it('should handle ORBIT_START_AUTH and forward to background', async () => {
    // Import the auth listener to register the window message listener
    const al = await import('../../src/entrypoints/auth_listener');
    al.default.main({} as any);
    
    const sendMessageSpy = vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockResolvedValue({ success: true });
    
    // Simulate receiving a message from the webpage
    const event = new MessageEvent('message', {
      data: {
        type: 'ORBIT_START_AUTH',
        payload: { siteUrl: 'https://example.com', clientId: 'client123' }
      },
      source: window
    });
    
    window.dispatchEvent(event);
    
    // Verify it forwarded to background
    expect(sendMessageSpy).toHaveBeenCalledWith(
      {
        type: 'START_OAUTH_FLOW',
        payload: { siteUrl: 'https://example.com', clientId: 'client123' }
      },
      expect.any(Function)
    );
  });
});
