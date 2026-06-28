import logger from '../../utils/logging';
import { SiteAuth } from '../../models/auth';
import { Result } from '../../nodes/types';

export interface SentryConfig {
  dsn: string;
}

export interface PosthogConfig {
  api_key: string;
  host: string;
}

export async function fetchSentryConfig(site: SiteAuth): Promise<Result<SentryConfig>> {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_action.sentry.get_config`, {
      headers: { 'Authorization': `Bearer ${site.accessToken}` },
      credentials: 'omit'
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, data: data.message };
    }
    return { success: false, error: String(new Error(`Failed to fetch Sentry config from ${site.url}`)) };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url }, `Failed to fetch Sentry config from ${site.url}`);
    return { success: false, error: String(error as Error) };
  }
}

export async function fetchPosthogConfig(site: SiteAuth): Promise<Result<PosthogConfig>> {
  try {
    const response = await fetch(`${site.url}/api/method/frappe_action.posthog.get_config`, {
      headers: { 'Authorization': `Bearer ${site.accessToken}` },
      credentials: 'omit'
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, data: data.message };
    }
    return { success: false, error: String(new Error(`Failed to fetch PostHog config from ${site.url}`)) };
  } catch (error) {
    logger.error({ err: error, siteUrl: site.url }, `Failed to fetch PostHog config from ${site.url}`);
    return { success: false, error: String(error as Error) };
  }
}
