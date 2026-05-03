/**
 * Sentry Edge Runtime configuration.
 * Applies to Next.js middleware (proxy.ts) running on the Vercel Edge network.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
});
