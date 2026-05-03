/**
 * Adherence scoring — what percentage of days did the user hit their targets?
 * Returns 0–100. All functions are pure and dependency-free.
 */
import type { DailySummary } from "@/types/database";

/** Percentage of days with at least one workout logged. */
export function workoutAdherence(summaries: DailySummary[], targetDaysPerWeek: number): number {
  if (!summaries.length) return 0;
  const weeks = summaries.length / 7;
  const targetTotal = targetDaysPerWeek * weeks;
  const actual = summaries.filter((d) => d.workout_count > 0).length;
  return Math.min(100, Math.round((actual / targetTotal) * 100));
}

/** Percentage of days where calorie target was met (within 10% tolerance). */
export function calorieAdherence(summaries: DailySummary[], targetKcal: number): number {
  if (!summaries.length || !targetKcal) return 0;
  const logged = summaries.filter((d) => d.total_calories > 0);
  if (!logged.length) return 0;
  const onTarget = logged.filter(
    (d) => d.total_calories >= targetKcal * 0.9 && d.total_calories <= targetKcal * 1.1,
  ).length;
  return Math.round((onTarget / logged.length) * 100);
}

/** Percentage of days where water target was met. */
export function waterAdherence(summaries: DailySummary[], targetMl: number): number {
  if (!summaries.length || !targetMl) return 0;
  const met = summaries.filter((d) => d.total_water_ml >= targetMl).length;
  return Math.round((met / summaries.length) * 100);
}

/** Percentage of days where sleep target was met (within 30 min tolerance). */
export function sleepAdherence(summaries: DailySummary[], targetMinutes: number): number {
  if (!summaries.length || !targetMinutes) return 0;
  const logged = summaries.filter((d) => d.total_sleep_minutes > 0);
  if (!logged.length) return 0;
  const met = logged.filter((d) => d.total_sleep_minutes >= targetMinutes - 30).length;
  return Math.round((met / logged.length) * 100);
}

/** Overall health score: weighted average of all adherence metrics. */
export function overallScore(scores: number[]): number {
  const defined = scores.filter((s) => s > 0);
  if (!defined.length) return 0;
  return Math.round(defined.reduce((a, b) => a + b, 0) / defined.length);
}
