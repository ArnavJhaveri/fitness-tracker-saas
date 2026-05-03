/**
 * Shared formatting helpers used across the UI.
 * Keep these pure (no side effects, no imports from React/Next).
 */

/** Format a weight in kg, optionally converting to lbs. */
export function formatWeight(kg: number, unit: "kg" | "lbs" = "kg"): string {
  if (unit === "lbs") {
    return `${(kg * 2.20462).toFixed(1)} lbs`;
  }
  return `${kg.toFixed(1)} kg`;
}

/** Format ml → human-readable with litre threshold. */
export function formatVolume(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(2).replace(/\.?0+$/, "")} L` : `${ml} ml`;
}

/** Format minutes → "Xh Ym" or "Ym" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format a number with commas e.g. 1234 → "1,234" */
export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format calories with "kcal" suffix */
export function formatCalories(kcal: number): string {
  return `${formatNumber(Math.round(kcal))} kcal`;
}

/** Format a macro value (g) */
export function formatMacro(g: number): string {
  return `${g.toFixed(1)}g`;
}

/** Relative date label: "Today", "Yesterday", or locale date */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const normalize = (d: Date) => d.toDateString();
  if (normalize(date) === normalize(today)) return "Today";
  if (normalize(date) === normalize(yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Format a percentage: 0.75 → "75%" */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
