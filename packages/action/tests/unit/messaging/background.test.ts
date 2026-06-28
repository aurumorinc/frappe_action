import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMessageListeners } from '../../../src/messaging/background';
import { browser } from 'wxt/browser';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      onMessage: {
        addListener: vi.fn()
      }
    },
    identity: {
      getRedirectURL: vi.fn().mockReturnValue('https://redirect.url')
    }
  }
}));

describe('MessageHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (browser.identity.getRedirectURL as any).mockReturnValue('https://redirect.url');
  });

  it('should register message listeners', () => {
    setupMessageListeners();
    expect(browser.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it('should route GET_REDIRECT_URI correctly', () => {
    setupMessageListeners();
    const listener = (browser.runtime.onMessage.addListener as any).mock.calls[0][0];
    
    const sendResponse = vi.fn();
    const result = listener({ type: 'GET_REDIRECT_URI' }, {}, sendResponse);
    
    expect(result).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ redirect_uri: 'https://redirect.url' });
  });
});
