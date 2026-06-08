import { posthog } from 'posthog-js';

export class PostHogManager {
  private static configs: Record<string, { apiKey: string; host: string }> = {};
  private static initializedSites: Set<string> = new Set();

  static registerSiteConfig(siteUrl: string, apiKey: string, host: string = 'https://app.posthog.com') {
    this.configs[siteUrl] = { apiKey, host };
    this.initClient(siteUrl);
  }

  private static initClient(siteUrl: string) {
    const config = this.configs[siteUrl];
    if (!config || this.initializedSites.has(siteUrl)) return;

    posthog.init(config.apiKey, {
      api_host: config.host,
      persistence: 'localStorage',
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      name: siteUrl, // Create a named instance for this site
    });

    this.initializedSites.add(siteUrl);
  }

  static captureEvent(siteUrl: string, eventName: string, properties?: any) {
    if (this.initializedSites.has(siteUrl)) {
      // Access the named instance and capture the event
      const instance = (posthog as any)[siteUrl];
      if (instance) {
        instance.capture(eventName, properties);
      }
    }
  }
}
