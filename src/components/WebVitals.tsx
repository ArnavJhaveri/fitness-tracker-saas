"use client";

/**
 * Web Vitals reporter — measures and forwards Core Web Vitals to analytics.
 *
 * Mounted once in the root layout. Measurements are sent to your analytics
 * endpoint (or Sentry performance) so you can track real-user performance.
 *
 * Metrics captured:
 *   LCP  — Largest Contentful Paint (loading performance)
 *   CLS  — Cumulative Layout Shift (visual stability)
 *   INP  — Interaction to Next Paint (interactivity, replaces FID)
 *   FCP  — First Contentful Paint
 *   TTFB — Time to First Byte (server response speed)
 */
import { useReportWebVitals } from "next/web-vitals";
import * as Sentry from "@sentry/nextjs";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Forward to Sentry performance as a custom measurement.
    // This shows up in Sentry's performance dashboard under "Custom Metrics".
    Sentry.setMeasurement(metric.name, metric.value, metric.name === "CLS" ? "" : "millisecond");

    // Log in development to make it easy to spot regressions locally.
    if (process.env.NODE_ENV === "development") {
      const rating = metric.rating ?? "—";
      const colour =
        metric.rating === "good"
          ? "\x1b[32m" // green
          : metric.rating === "needs-improvement"
            ? "\x1b[33m" // yellow
            : "\x1b[31m"; // red
      console.warn(
        `${colour}[Web Vitals] ${metric.name}: ${Math.round(metric.value)} (${rating})\x1b[0m`,
      );
    }
  });

  // This component renders nothing — it is a side-effect-only hook host.
  return null;
}
