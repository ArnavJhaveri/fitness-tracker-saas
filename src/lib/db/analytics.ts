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
 * Today's snapshot — single row from the daily summary for the current date.
 * Note: the API route accepts `from`/`to` as client-supplied local dates, so
 * callers that need the user's local "today" should pass it from the request
 * rather than computing it server-side.  This helper is only used internally
 * and is correct for UTC-based server operations.
 */
export async function getTodaySummary(
  supabase: SupabaseClient,
  userId: string,
  localDate?: string,
): Promise<DailySummary | null> {
  // Prefer a caller-supplied local date; fall back to server UTC (may differ by up to ±12h)
  const today = localDate ?? new Date().toISOString().split("T")[0];
  const rows = await getDailySummary(supabase, userId, today, today);
  return rows[0] ?? null;
}
