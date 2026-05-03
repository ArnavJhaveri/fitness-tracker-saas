/**
 * Sentry server (Node.js) configuration.
 * Captures errors in API Route Handlers and Server Components.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // Capture all server errors — these are not the user's browser, so
  // performance overhead is less of a concern. Keep traces lower to control cost.
  tracesSampleRate: 0.2,

  // Add the user's Supabase UUID to every event so issues can be correlated
  // with support requests without capturing PII.
  beforeSend(event) {
    // Do not forward events with no exception (e.g. console.error calls)
    // to avoid noise.
    if (!event.exception) return null;
    return event;
  },
});
