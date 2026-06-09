import pino from 'pino';
import { browser } from 'wxt/browser';
import { SentryManager } from '../lib/sentry';
import { PostHogManager } from '../lib/posthog';

// Expose a global array for E2E tests to capture logs
if (typeof window !== 'undefined') {
  (window as any).__ORBIT_LOGS__ = [];
}

const isBackground = () => typeof window === 'undefined';
const telemetryBuffer: any[] = [];

export function sanitizeUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.origin + url.pathname;
  } catch (e) {
    return urlStr;
  }
}

export function transmitTelemetry(level: number, logEvent: any) {
  // 1. Output to standard console for local debugging
  const msg = `[Orbit] ${logEvent.messages[0]}`;
  
  if (level >= 50) {
    console.error(msg, logEvent);
  } else if (level >= 40) {
    console.warn(msg, logEvent);
  } else if (level >= 30) {
    console.info(msg, logEvent);
  } else {
    console.debug(msg, logEvent);
  }

  // 2. Capture logs for E2E assertions
  if (typeof window !== 'undefined' && (window as any).__ORBIT_LOGS__) {
    (window as any).__ORBIT_LOGS__.push(logEvent);
  }

  // 3. Hub-and-Spoke Telemetry
  if (!isBackground()) {
    if (browser && browser.runtime && browser.runtime.sendMessage) {
      browser.runtime.sendMessage({
        type: 'LOG_TRANSMIT',
        payload: { level, logEvent }
      }).catch(() => {
        // Ignore errors if background script is not ready
      });
    }
  } else {
    processTelemetry(level, logEvent);
  }
}

export function processTelemetry(level: number, logEvent: any) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    telemetryBuffer.push({ level, logEvent });
    return;
  }

  const siteUrlBinding = logEvent.messages?.find((m: any) => typeof m === 'object' && m !== null && 'siteUrl' in m);
  const siteUrl = siteUrlBinding?.siteUrl;

  // Sentry Integration
  if (level >= 50 && siteUrl) {
    const errBinding = logEvent.messages?.find((m: any) => m instanceof Error || (typeof m === 'object' && m !== null && 'err' in m));
    const errorObj = errBinding?.err || errBinding || new Error(logEvent.messages?.[0] as string || 'Unknown error');
    SentryManager.captureError(siteUrl, errorObj, { logEvent });
  }

  // PostHog Integration
  const eventNameBinding = logEvent.messages?.find((m: any) => typeof m === 'object' && m !== null && 'eventName' in m);
  if (eventNameBinding && eventNameBinding.eventName && siteUrl) {
    PostHogManager.captureEvent(siteUrl, eventNameBinding.eventName, {
      ...eventNameBinding,
      extension_version: (import.meta as any).env?.PKG_VERSION || 'unknown',
    });
  }
}

if (isBackground() && typeof self !== 'undefined') {
  self.addEventListener('online', () => {
    while (telemetryBuffer.length > 0) {
      const item = telemetryBuffer.shift();
      if (item) {
        processTelemetry(item.level, item.logEvent);
      }
    }
  });
}

const baseLogger = pino({
  level: (import.meta as any).env?.MODE === 'development' ? 'debug' : 'info',
  base: { version: (import.meta as any).env?.PKG_VERSION || 'unknown' },
  browser: {
    asObject: true,
    transmit: {
      level: 'debug', // Transmit all levels, we filter in send
      send: (level, logEvent) => {
        const levelNum = pino.levels.values[level];
        transmitTelemetry(levelNum, logEvent);
      }
    }
  }
});

export default baseLogger;
