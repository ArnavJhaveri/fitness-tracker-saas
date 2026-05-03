/**
 * Sentry browser client configuration.
 * Loaded automatically by Next.js when @sentry/nextjs is installed.
 *
 * Keep this file minimal — heavy configuration belongs in the instrumentation
 * file so it runs server-side only. This file runs in every user's browser.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only capture errors in production. Dev errors are visible in the console.
  enabled: process.env.NODE_ENV === "production",

  // Sample 10% of performance traces to keep costs manageable.
  // Increase to 1.0 for debugging; decrease further at high traffic.
  tracesSampleRate: 0.1,

  // Capture replays for 1% of sessions and 100% of sessions with errors.
  // Session replays dramatically speed up debugging UI issues.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all images by default — critical for GDPR
      // compliance with a health-data app.
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Scrub sensitive fields before they reach Sentry.
  beforeSend(event) {
    // Strip auth tokens from breadcrumbs and request bodies.
    if (event.request?.data && typeof event.request.data === "object") {
      const data = event.request.data as Record<string, unknown>;
      if (data.password) data.password = "[Filtered]";
      if (data.token) data.token = "[Filtered]";
    }
    return event;
  },
});
