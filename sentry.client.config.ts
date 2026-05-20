import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.5,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  ignoreErrors: [
    'NetworkError when attempting to fetch resource',
    'Failed to fetch',
    'AbortError',
    'Non-Error promise rejection captured',
  ],
});
