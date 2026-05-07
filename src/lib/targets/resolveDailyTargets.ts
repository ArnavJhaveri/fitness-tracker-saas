/**
 * Resolve the daily targets that were active for a given user on a given date.
 *
 * Resolution rules (in order):
 *   1. Find the user's phase whose [start_date, actual_end_date OR ∞) covers
 *      the requested date AND status='active'. (For historical dates, an
 *      'ended'/'superseded' phase that was active at that time is also valid.)
 *   2. For each target field, use the phase value if non-null, else fall back
 *      to user_settings.
 *   3. If no phase covered that date, return user_settings only — companion mode.
 *
 * This means analytics for past days always reflect the targets that were in
 * place at the time, even after a phase change. The "what was my calorie
 * target on day 14?" question has a deterministic answer.
 *
 * The function is pure given DB inputs — no auth checks here, callers must
 * have already verified ownership.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Phase, ResolvedDailyTargets, UserSettings, UUID } from "@/types/database";

/**
 * Numeric target fields shared by the phase and user_settings tables. Listed
 * explicitly (not derived) so the `pick<K>` generic below can't accidentally
 * be called with `user_id` or another non-target field — that would silently
 * return null instead of a real value.
 */
type PickableTargetField =
  | "daily_calorie_target"
  | "daily_protein_target_g"
  | "daily_carbs_target_g"
  | "daily_fat_target_g"
  | "daily_sugar_target_g"
  | "daily_water_target_ml"
  | "weekly_workout_hours_target";

type SettingsTargets = Pick<UserSettings, PickableTargetField | "sleep_target_minutes">;

/**
 * Apply the resolution rules to in-memory phase + settings rows. Useful for
 * unit testing without a Supabase client.
 */
export function applyResolution(
  settings: SettingsTargets | null,
  phase: Phase | null,
): ResolvedDailyTargets {
  // Pull each field from phase first (if non-null), else from settings.
  // PickableTargetField is the literal union — calling pick("user_id") is
  // a TS error rather than a silent runtime null.
  const pick = (field: PickableTargetField): number | null => {
    const p = phase?.[field];
    if (p != null) return p;
    const s = settings?.[field];
    return s ?? null;
  };

  return {
    daily_calorie_target: pick("daily_calorie_target"),
    daily_protein_target_g: pick("daily_protein_target_g"),
    daily_carbs_target_g: pick("daily_carbs_target_g"),
    daily_fat_target_g: pick("daily_fat_target_g"),
    daily_sugar_target_g: pick("daily_sugar_target_g"),
    daily_water_target_ml: pick("daily_water_target_ml"),
    // sleep target only exists on user_settings (no phase-level override yet)
    sleep_target_minutes: settings?.sleep_target_minutes ?? null,
    weekly_workout_hours_target: pick("weekly_workout_hours_target"),
    active_phase_id: phase?.id ?? null,
    active_phase_name: phase?.name ?? null,
    active_phase_type: phase?.phase_type ?? null,
  };
}

/**
 * Find the phase that covered `date` for `userId`. Returns the most recently
 * started phase whose [start_date, actual_end_date OR today] covers the date.
 *
 * Status filter — we look at:
 *   - 'active'      → currently running phase
 *   - 'ended'       → terminated phase whose date range still covers `date`
 *                     (historical reads of the period it was active)
 *   - 'superseded'  → ditto, just replaced by a successor
 *
 * 'planned' phases are EXCLUDED. A phase the user is preparing but hasn't
 * activated must never apply targets retroactively to dates before it
 * actually starts running. (Without this filter, a planned phase with a
 * past start_date would silently override the user's settings.)
 */
async function findPhaseForDate(
  supabase: SupabaseClient,
  userId: UUID,
  date: string, // YYYY-MM-DD
): Promise<Phase | null> {
  const { data, error } = await supabase
    .from("phases")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "ended", "superseded"])
    .lte("start_date", date)
    .or(`actual_end_date.is.null,actual_end_date.gte.${date}`)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as Phase | null) ?? null;
}

/**
 * Main entry point. Loads user_settings + the phase covering `date` and
 * applies the resolution rules.
 *
 * @param date - YYYY-MM-DD; defaults to today (server's UTC date)
 */
export async function resolveDailyTargets(
  supabase: SupabaseClient,
  userId: UUID,
  date?: string,
): Promise<ResolvedDailyTargets> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const [settingsRes, phase] = await Promise.all([
    supabase
      .from("user_settings")
      .select(
        "daily_calorie_target, daily_protein_target_g, daily_carbs_target_g, daily_fat_target_g, daily_sugar_target_g, daily_water_target_ml, sleep_target_minutes, weekly_workout_hours_target",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    findPhaseForDate(supabase, userId, targetDate),
  ]);

  if (settingsRes.error) throw settingsRes.error;

  return applyResolution(settingsRes.data as Parameters<typeof applyResolution>[0], phase);
}
