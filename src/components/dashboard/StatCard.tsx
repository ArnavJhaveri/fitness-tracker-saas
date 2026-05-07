"use client";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils/cn";

const COLOR_MAP = {
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
} as const;

const PROGRESS_COLOR_MAP = {
  indigo: "indigo",
  orange: "orange",
  violet: "violet",
  blue: "blue",
  rose: "red",
  emerald: "green",
} as const satisfies Record<
  keyof typeof COLOR_MAP,
  "indigo" | "blue" | "green" | "orange" | "violet" | "red"
>;

export type StatCardColor = keyof typeof COLOR_MAP;

interface Props {
  icon: React.ElementType;
  label: string;
  /** Current value. Pass null/0 explicitly when nothing is logged today; the
   *  card renders a sensible "—" placeholder rather than "0 / 2200". */
  value: number | null;
  /** Unit label shown beneath the number (e.g. "kcal", "ml"). */
  unit: string;
  /** Display formatter, used for the headline number (e.g. round to int,
   *  toLocaleString for thousands separators). Defaults to identity. */
  format?: (n: number) => string;
  /** Optional target. When set AND value is non-null, the card renders the
   *  value as "X / target unit" with a progress bar. When null (companion
   *  mode), the card renders only the value and unit — no fake comparisons. */
  target?: number | null;
  color: StatCardColor;
  /** Sublabel shown when no target is set (e.g. "today", "logged"). */
  emptyLabel?: string;
}

/**
 * Stat card that renders gracefully in BOTH target-driven mode (phase or
 * user_settings provides a number to compare against) and companion mode
 * (no target — show the raw logged value only).
 *
 * Visual behaviour:
 *   - target set + value > 0  → "1,847 / 2,200 kcal" + 84 % progress bar
 *   - target set + value 0    → "0 / 2,200 kcal" + empty progress bar
 *   - no target  + value > 0  → "1,847 kcal · today"
 *   - no target  + value 0    → "— kcal · today"
 *
 * The split prevents the previous bug where "0 / —" was shown for users
 * who hadn't set a target yet, conflating "you haven't logged today" with
 * "we don't have a goal for you".
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  format = (n) => String(n),
  target,
  color,
  emptyLabel,
}: Props) {
  const hasTarget = target != null && target > 0;
  const isEmpty = value == null || value <= 0;
  const formatted = isEmpty ? "—" : format(value!);

  // Progress against target — capped at 100% for the bar, but the headline
  // can still show >100% (e.g. 2,300 / 2,200 kcal) so the user sees they
  // exceeded the target.
  const pct = hasTarget && !isEmpty ? Math.min(100, (value! / target!) * 100) : 0;

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-lg p-2", COLOR_MAP[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="truncate text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatted}
              {hasTarget && !isEmpty && (
                <span className="ml-1 text-sm font-normal text-gray-400">/ {format(target!)}</span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {hasTarget ? unit : `${unit}${emptyLabel ? ` · ${emptyLabel}` : ""}`}
            </p>
          </div>
        </div>
        {hasTarget && <ProgressBar value={pct} size="sm" color={PROGRESS_COLOR_MAP[color]} />}
      </div>
    </Card>
  );
}
