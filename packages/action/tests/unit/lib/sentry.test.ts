import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SentryManager } from '../../../src/lib/sentry';
import * as Sentry from '@sentry/browser';

const mockClient = {
  captureException: vi.fn()
};

vi.mock('@sentry/browser', () => {
  return {
    BrowserClient: class {
      constructor() {
        return mockClient;
      }
    },
    makeFetchTransport: vi.fn(),
    defaultStackParser: vi.fn(),
    browserTracingIntegration: vi.fn(),
    withScope: vi.fn((callback) => {
      const mockScope = {
        setExtras: vi.fn()
      };
      callback(mockScope);
    })
  };
});

describe('SentryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state
    (SentryManager as any).configs = {};
    (SentryManager as any).clients = {};
  });

  it('should register site config and initialize client', () => {
    SentryManager.registerSiteConfig('https://test.com', 'https://dsn@sentry.io/123');
    
    expect((SentryManager as any).clients['https://test.com']).toBeDefined();
  });

  it('should capture error if client is initialized', () => {
    SentryManager.registerSiteConfig('https://test.com', 'https://dsn@sentry.io/123');
    
    const error = new Error('Test error');
    SentryManager.captureError('https://test.com', error, { extra: 'data' });
    
    expect(Sentry.withScope).toHaveBeenCalled();
    const client = (SentryManager as any).clients['https://test.com'];
    expect(client.captureException).toHaveBeenCalledWith(error, undefined, expect.any(Object));
  });

  it('should not capture error if client is not initialized', () => {
    const error = new Error('Test error');
    SentryManager.captureError('https://unknown.com', error);
    
    expect(Sentry.withScope).not.toHaveBeenCalled();
  });
});
