/**
 * Widget visibility rules for the companion-mode dashboard.
 *
 * A widget is shown when EITHER:
 *   1. The user opted in to a related primary_intent during onboarding, OR
 *   2. The user has logged data of that kind in the recent past (typically
 *      the last 30 days)
 *
 * Rule 2 means a returning user who never finished onboarding still sees
 * widgets matching their actual usage. Rule 1 means a fresh user who chose
 * "lose weight" sees the nutrition card immediately, even before their
 * first meal log.
 *
 * If `intents` is null (user hasn't onboarded yet), we treat ALL widgets
 * as eligible via rule 1 — showing the full layout to new users avoids
 * surprising them with a sparse dashboard, and the "Finish setting up"
 * banner is the cue that picking intents will customise the view later.
 */
import type { PrimaryIntent } from "@/types/database";

export function widgetEnabled(
  /** The set of intents that imply this widget is wanted */
  matchingIntents: readonly PrimaryIntent[],
  /** The user's stored intents from user_settings, or null if not onboarded */
  intents: PrimaryIntent[] | null | undefined,
  /** Whether the user has logged any relevant data recently */
  hasRecentData: boolean,
): boolean {
  // Not onboarded → show everything by default; user is exploring.
  if (intents == null) return true;
  // Explicit opt-in via intent → always show.
  if (intents.some((i) => matchingIntents.includes(i))) return true;
  // Otherwise reveal only when the user is actually using this domain.
  return hasRecentData;
}

// ─── Per-widget intent groupings ──────────────────────────────────────────────
// Curated here (not in the dashboard component) so callers can reuse them
// without recomputing arrays each render.

export const NUTRITION_INTENTS: readonly PrimaryIntent[] = [
  "track_nutrition",
  "lose_weight",
  "gain_muscle",
];

export const WORKOUT_INTENTS: readonly PrimaryIntent[] = [
  "track_workouts",
  "improve_endurance",
  "gain_muscle",
  "general_fitness",
];

export const SLEEP_INTENTS: readonly PrimaryIntent[] = ["improve_sleep", "general_fitness"];

export const WATER_INTENTS: readonly PrimaryIntent[] = [
  "track_nutrition",
  "general_fitness",
  "lose_weight",
];
