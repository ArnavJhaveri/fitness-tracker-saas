/**
 * Streak utilities — pure functions, no side effects.
 * A "streak" is a consecutive sequence of days where a condition was met.
 */
import type { DailySummary } from "@/types/database";

/** Local calendar date as "YYYY-MM-DD" — correct in all timezones. */
function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Calculate the current workout streak (consecutive days ending today
 * or yesterday that have at least one completed workout).
 */
export function calcWorkoutStreak(summaries: DailySummary[]): number {
  const sorted = [...summaries].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const today = localDateStr(); // local date — correct for all timezones
  const yesterday = prevDay(today);

  // A streak is still alive if the user worked out yesterday but not yet today.
  // Start from whichever is the most recent day that has a row.
  const mostRecent = sorted.find((d) => d.log_date <= today);
  const startDate = mostRecent?.log_date ?? today;

  // If the most recent row is older than yesterday the streak is already broken.
  if (startDate < yesterday) return 0;

  let streak = 0;
  let expected = startDate;

  for (const day of sorted) {
    if (day.log_date > expected) continue; // future dates — skip
    if (day.log_date < expected) break; // gap — streak broken
    if (day.workout_count > 0) {
      streak++;
      expected = prevDay(day.log_date);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate the current water streak (days meeting the target).
 */
export function calcWaterStreak(summaries: DailySummary[], targetMl: number): number {
  const sorted = [...summaries].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const today = localDateStr(); // local date — correct for all timezones
  const yesterday = prevDay(today);

  const mostRecent = sorted.find((d) => d.log_date <= today);
  const startDate = mostRecent?.log_date ?? today;

  if (startDate < yesterday) return 0;

  let streak = 0;
  let expected = startDate;

  for (const day of sorted) {
    if (day.log_date > expected) continue;
    if (day.log_date < expected) break;
    if (day.total_water_ml >= targetMl) {
      streak++;
      expected = prevDay(day.log_date);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Longest workout streak in the dataset.
 */
export function calcLongestWorkoutStreak(summaries: DailySummary[]): number {
  const sorted = [...summaries].sort((a, b) => a.log_date.localeCompare(b.log_date));

  let current = 0;
  let best = 0;
  let prev: string | null = null;

  for (const day of sorted) {
    if (day.workout_count > 0) {
      if (prev && day.log_date === nextDay(prev)) {
        current++;
      } else {
        current = 1;
      }
      best = Math.max(best, current);
      prev = day.log_date;
    } else {
      current = 0;
      prev = null;
    }
  }

  return best;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}
