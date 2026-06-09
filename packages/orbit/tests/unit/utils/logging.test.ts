import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeUrl, processTelemetry, transmitTelemetry } from '../../../src/utils/logging';
import { SentryManager } from '../../../src/lib/sentry';
import { PostHogManager } from '../../../src/lib/posthog';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined)
    }
  }
}));

vi.mock('../../../src/lib/sentry', () => ({
  SentryManager: {
    captureError: vi.fn()
  }
}));

vi.mock('../../../src/lib/posthog', () => ({
  PostHogManager: {
    captureEvent: vi.fn()
  }
}));

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize valid URLs', () => {
      expect(sanitizeUrl('https://example.com/path?query=123')).toBe('https://example.com/path');
    });

    it('should return original string for invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBe('not-a-url');
    });
  });

  describe('processTelemetry', () => {
    it('should buffer telemetry when offline', () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true
      });
      
      processTelemetry(50, { messages: [{ siteUrl: 'https://test.com' }] });
      
      expect(SentryManager.captureError).not.toHaveBeenCalled();
      expect(PostHogManager.captureEvent).not.toHaveBeenCalled();
    });

    it('should send error to Sentry when level >= 50 and siteUrl is present', () => {
      const error = new Error('Test error');
      processTelemetry(50, { messages: [{ siteUrl: 'https://test.com', err: error }] });
      
      expect(SentryManager.captureError).toHaveBeenCalledWith('https://test.com', error, expect.any(Object));
    });

    it('should send event to PostHog when eventName and siteUrl are present', () => {
      processTelemetry(30, { messages: [{ siteUrl: 'https://test.com', eventName: 'test_event' }] });
      
      expect(PostHogManager.captureEvent).toHaveBeenCalledWith('https://test.com', 'test_event', expect.objectContaining({
        eventName: 'test_event',
        siteUrl: 'https://test.com'
      }));
    });
  });

  describe('transmitTelemetry', () => {
    it('should send LOG_TRANSMIT message in non-background context', async () => {
      // Mock window to simulate non-background context
      const originalWindow = global.window;
      global.window = {} as any;
      
      // We need to re-import to pick up the new window state for isBackground()
      vi.resetModules();
      
      const { browser: mockBrowser } = await import('wxt/browser');
      const { transmitTelemetry: newTransmitTelemetry } = await import('../../../src/utils/logging');
      
      // Mock console to avoid cluttering test output
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      
      newTransmitTelemetry(30, { messages: ['Test message'] });
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'LOG_TRANSMIT',
        payload: {
          level: 30,
          logEvent: { messages: ['Test message'] }
        }
      });
      
      consoleSpy.mockRestore();
      global.window = originalWindow;
    });
  });
});
