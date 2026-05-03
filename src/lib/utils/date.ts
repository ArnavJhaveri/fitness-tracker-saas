/**
 * Shared date utilities.
 *
 * Browser's `Date` always reflects the user's local timezone.
 * These helpers extract calendar fields (year/month/day) using local getters
 * rather than toISOString() — which always returns UTC — so they work
 * correctly for users in any timezone including UTC±12.
 */

/**
 * Returns a local calendar date string "YYYY-MM-DD" for the given Date
 * (defaults to now). Safe in all timezones.
 *
 * @example localDateStr()              // "2025-08-15" (wherever the user is)
 * @example localDateStr(new Date(ts))  // date at that timestamp in local tz
 */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
