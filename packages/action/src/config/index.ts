import { z } from 'zod';

const envSchema = z.object({
  SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate environment variables
export const config = envSchema.parse({
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  POSTHOG_API_KEY: import.meta.env.VITE_POSTHOG_API_KEY,
  POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
  NODE_ENV: import.meta.env.MODE,
});

export const constants = {
  EXTENSION_NAME: 'Action',
  VERSION: import.meta.env.PKG_VERSION || '1.0.0',
};
