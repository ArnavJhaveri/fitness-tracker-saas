/**
 * Trend utilities — moving averages, delta calculations, direction indicators.
 * All pure functions. Used by chart components and stat cards.
 */
import type { DailySummary } from "@/types/database";

/**
 * 7-day simple moving average of a numeric field.
 * Accepts null values — they are excluded from each window's average so that
 * days with no data (e.g. no weight logged) don't drag the average toward zero.
 * Returns null for a window that contains no non-null values.
 */
export function movingAverage(
  data: Pick<DailySummary, "log_date">[],
  values: (number | null)[],
  window = 7,
): { date: string; value: number | null }[] {
  return data.map((d, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v != null);
    if (!slice.length) return { date: d.log_date, value: null };
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return { date: d.log_date, value: Math.round(avg * 10) / 10 };
  });
}

/** Compare the last N days average vs the N days before that. Returns % change. */
export function periodDelta(values: number[], period = 7): number {
  const recent = values.slice(-period).filter((v) => v > 0);
  const prior = values.slice(-period * 2, -period).filter((v) => v > 0);
  if (!recent.length || !prior.length) return 0;

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;

  return Math.round(((recentAvg - priorAvg) / priorAvg) * 100);
}

/** Latest non-zero weight entry from summary data. */
export function latestWeight(summaries: DailySummary[]): number | null {
  const sorted = [...summaries].sort((a, b) => b.log_date.localeCompare(a.log_date));
  return sorted.find((d) => d.weight_kg != null)?.weight_kg ?? null;
}

/** Format a delta for display: "+3%" or "-2%" */
export function formatDelta(delta: number): string {
  if (delta === 0) return "—";
  return delta > 0 ? `+${delta}%` : `${delta}%`;
}

/** "up" | "down" | "flat" direction for visual indicators. */
export function trendDirection(delta: number): "up" | "down" | "flat" {
  if (delta > 1) return "up";
  if (delta < -1) return "down";
  return "flat";
}
