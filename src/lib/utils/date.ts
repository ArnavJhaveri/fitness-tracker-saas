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

/**
 * Returns the calendar date "YYYY-MM-DD" in the given IANA timezone.
 *
 * Necessary on the server, where the host's local timezone (typically UTC)
 * does NOT match the user's, and "today" must be computed against the user's
 * configured timezone. Without this, ending a phase at 22:00 NZT would record
 * `actual_end_date` as the next UTC day — wrong by 12 hours.
 *
 * Falls back to UTC if the supplied timezone is invalid (Intl.DateTimeFormat
 * throws), so a misconfigured user_settings.timezone never breaks writes.
 *
 * @param timezone - IANA name, e.g. "Europe/London", "Pacific/Auckland"
 * @param d        - moment in time (defaults to now)
 */
export function localDateStrInTz(timezone: string, d: Date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD by default — the cleanest way to get a
    // calendar date from Intl.DateTimeFormat without manual zero-padding.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    // Invalid timezone — fall back to UTC. The application may want to
    // surface a separate error elsewhere; this helper stays write-safe.
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Returns the date one day before `dateStr` (YYYY-MM-DD). Pure calendar
 * arithmetic via UTC midnight — no DST hazards, no timezone hazards.
 *
 * Used by phase pivot logic to set the old phase's `actual_end_date` to
 * "the day before the new phase starts" so analytics on the cut-over day
 * are unambiguous.
 *
 * @example dayBefore("2026-04-01") === "2026-03-31"
 * @example dayBefore("2026-03-01") === "2026-02-28" (or "2026-02-29" leap)
 */
export function dayBefore(dateStr: string): string {
  // Build a UTC midnight Date from the YYYY-MM-DD string. Using Date.UTC
  // (not the local-time constructor) means DST never enters the picture.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) throw new Error(`dayBefore: invalid date string '${dateStr}'`);
  const [, y, mo, d] = m;
  const utc = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

/**
 * True if `s` is a valid YYYY-MM-DD date string AND a real calendar date
 * (so "2026-13-45" returns false even though it matches the regex).
 *
 * Use this in Zod refines to reject impossible dates at the API boundary
 * rather than letting Postgres surface a generic 500 at insert time.
 */
export function isValidISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  // Round-trip via Date.UTC and verify the components survived — this
  // catches every bad input (Feb 30, month 13, etc.) without leap-year
  // bookkeeping.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
