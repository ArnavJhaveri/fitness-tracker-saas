/**
 * Monitoring utilities — thin wrappers around Sentry so the rest of the
 * codebase never imports from @sentry/nextjs directly. Swapping the
 * underlying provider is then a one-file change.
 */
import * as Sentry from "@sentry/nextjs";

export type Severity = "fatal" | "error" | "warning" | "info" | "debug";

/**
 * Capture an exception with optional context.
 * Use this instead of `console.error` in production-facing code paths.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

/**
 * Capture a custom message (non-exception event).
 * Useful for tracking important business events (e.g. "subscription created").
 */
export function captureMessage(
  message: string,
  severity: Severity = "info",
  context?: Record<string, unknown>,
): void {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureMessage(message, severity);
  });
}

/**
 * Set the authenticated user on all subsequent Sentry events.
 * Call this after successful sign-in. Pass null to clear on sign-out.
 */
export function identifyUser(userId: string | null): void {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Wrap an async function in a Sentry performance transaction.
 * Used for measuring critical paths (DB queries, API calls, etc.).
 */
export async function withSpan<T>(name: string, op: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name, op }, fn);
}
