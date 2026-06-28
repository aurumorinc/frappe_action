import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostHogManager } from '../../../src/lib/posthog';
import { posthog } from 'posthog-js';

vi.mock('posthog-js', () => {
  const mockInstance = {
    capture: vi.fn()
  };
  return {
    posthog: {
      init: vi.fn(),
      'https://test.com': mockInstance
    }
  };
});

describe('PostHogManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state
    (PostHogManager as any).configs = {};
    (PostHogManager as any).initializedSites = new Set();
  });

  it('should register site config and initialize client', () => {
    PostHogManager.registerSiteConfig('https://test.com', 'test_api_key');
    
    expect(posthog.init).toHaveBeenCalledWith('test_api_key', expect.objectContaining({
      api_host: 'https://app.posthog.com',
      name: 'https://test.com'
    }));
    expect((PostHogManager as any).initializedSites.has('https://test.com')).toBe(true);
  });

  it('should not initialize client twice for the same site', () => {
    PostHogManager.registerSiteConfig('https://test.com', 'test_api_key');
    PostHogManager.registerSiteConfig('https://test.com', 'test_api_key');
    
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it('should capture event if client is initialized', () => {
    PostHogManager.registerSiteConfig('https://test.com', 'test_api_key');
    
    PostHogManager.captureEvent('https://test.com', 'test_event', { prop: 'value' });
    
    const instance = (posthog as any)['https://test.com'];
    expect(instance.capture).toHaveBeenCalledWith('test_event', { prop: 'value' });
  });

  it('should not capture event if client is not initialized', () => {
    PostHogManager.captureEvent('https://unknown.com', 'test_event');
    
    const instance = (posthog as any)['https://test.com'];
    expect(instance.capture).not.toHaveBeenCalled();
  });
});
