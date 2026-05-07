import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailySummary } from "@/types/database";

/**
 * Fetch per-day aggregated summary for a user via the get_daily_summary RPC.
 *
 * The function runs as SECURITY INVOKER so all RLS on underlying tables applies.
 * The max range is capped at 366 days by the SQL function itself.
 *
 * @param from  ISO date string "YYYY-MM-DD", defaults to 30 days ago
 * @param to    ISO date string "YYYY-MM-DD", defaults to today
 */
export async function getDailySummary(
  supabase: SupabaseClient,
  userId: string,
  from?: string,
  to?: string,
): Promise<DailySummary[]> {
  const { data, error } = await supabase.rpc("get_daily_summary", {
    p_user_id: userId,
    ...(from ? { p_from: from } : {}),
    ...(to ? { p_to: to } : {}),
  });

  if (error) throw error;
  return (data ?? []) as DailySummary[];
}

/**
 * Today's snapshot — single row from the daily summary for the supplied
 * local date.
 *
 * `localDate` is REQUIRED. Earlier this helper accepted an optional date
 * and fell back to `new Date().toISOString().split("T")[0]` (UTC) when the
 * caller didn't pass one. That fallback was wrong by up to ±12 hours for
 * users far from UTC: a Pacific/Auckland user pulling "today's" macros at
 * 22:00 local would see the *next* UTC day's row (empty), and a UTC-12
 * user at 02:00 local would see *yesterday's*. There were no production
 * callers relying on the fallback — the only api route resolves the date
 * client-side and threads it through `getDailySummary` directly — so we
 * tighten the type rather than thread `user_settings.timezone` through.
 *
 * Callers should compute `localDate` either from a client-supplied query
 * param (request-driven) or from `localDateStrInTz(user_settings.timezone)`
 * (server-driven). Both paths produce a calendar date that matches the
 * user's wall clock.
 */
export async function getTodaySummary(
  supabase: SupabaseClient,
  userId: string,
  localDate: string,
): Promise<DailySummary | null> {
  const rows = await getDailySummary(supabase, userId, localDate, localDate);
  return rows[0] ?? null;
}
