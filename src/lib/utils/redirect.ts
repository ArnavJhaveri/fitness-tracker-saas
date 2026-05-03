/**
 * Guard against open-redirect vulnerabilities.
 *
 * A path is safe to redirect to when it is:
 *   1. A non-empty string that starts with "/"
 *   2. NOT a protocol-relative URL like "//evil.com"
 *      (`//evil.com` starts with "/" but browsers resolve it to
 *       https://evil.com, bypassing the origin check.)
 *
 * Usage:
 *   const safePath = isSafeRedirect(raw) ? raw : ROUTES.DASHBOARD;
 */
export function isSafeRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}
