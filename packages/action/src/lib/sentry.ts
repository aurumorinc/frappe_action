import * as Sentry from '@sentry/browser';

export class SentryManager {
  private static configs: Record<string, string> = {};
  private static clients: Record<string, Sentry.BrowserClient> = {};

  static registerSiteConfig(siteUrl: string, dsn: string) {
    this.configs[siteUrl] = dsn;
    this.initClient(siteUrl);
  }

  private static initClient(siteUrl: string) {
    const dsn = this.configs[siteUrl];
    if (!dsn) return;

    const client = new Sentry.BrowserClient({
      dsn,
      transport: Sentry.makeFetchTransport,
      stackParser: Sentry.defaultStackParser,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
    });

    this.clients[siteUrl] = client;
  }

  static captureError(siteUrl: string, error: any, extra?: any) {
    const client = this.clients[siteUrl];
    if (client) {
      Sentry.withScope((scope) => {
        if (extra) {
          scope.setExtras(extra);
        }
        client.captureException(error, undefined, scope);
      });
    }
  }
}
