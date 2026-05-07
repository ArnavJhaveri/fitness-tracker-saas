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
 * Apply the resolution rules to in-memory phase + settings rows. Useful for
 * unit testing without a Supabase client.
 */
export function applyResolution(
  settings: Pick<
    UserSettings,
    | "daily_calorie_target"
    | "daily_protein_target_g"
    | "daily_carbs_target_g"
    | "daily_fat_target_g"
    | "daily_sugar_target_g"
    | "daily_water_target_ml"
    | "sleep_target_minutes"
    | "weekly_workout_hours_target"
  > | null,
  phase: Phase | null,
): ResolvedDailyTargets {
  // Pull each field from phase first (if non-null), else from settings.
  const pick = <K extends keyof Phase & keyof UserSettings>(field: K): number | null => {
    const p = phase?.[field] as number | null | undefined;
    if (p != null) return p;
    const s = settings?.[field] as number | null | undefined;
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
 * started phase whose [start_date, actual_end_date OR today] covers the date,
 * regardless of status — so historical reads correctly attribute the target
 * to the phase that was active at the time.
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
