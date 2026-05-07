"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils/cn";
import type { MacroTotals } from "../utils/macros";

interface Props {
  totals: MacroTotals;
  /**
   * Optional per-macro targets. When a target is null/undefined the macro
   * still renders (so the user always sees what they ate today) but no
   * progress bar is drawn — companion mode.
   */
  targets?: {
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
  };
}

/**
 * Today's macros panel — renders the headline calorie counter at the top
 * and four side-by-side macro tiles below, each with an optional progress
 * bar when the user has a target set.
 *
 * Design constraints:
 *   - All four macros are always shown (calories + P/C/F). Sugar is
 *     excluded from this card to keep it scannable; it lives on the
 *     analytics page for users who track it explicitly.
 *   - When no targets exist (companion mode), the layout collapses to
 *     just the totals — no fake "—%" comparisons, no broken progress bars.
 *   - Calorie progress turns red when over 110 % so the user spots
 *     overshoots without reading the percentage.
 */
export function MacroSummary({ totals, targets }: Props) {
  const calTarget = targets?.calories ?? null;
  const calPct = calTarget ? (totals.calories / calTarget) * 100 : null;
  const calRemaining = calTarget ? Math.max(0, calTarget - totals.calories) : null;
  const calOver = calPct != null && calPct > 100;

  return (
    <div className="flex flex-col gap-5">
      {/* Headline calorie counter */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(totals.calories).toLocaleString()}
            </span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">kcal</span>
            {calTarget && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                of {calTarget.toLocaleString()}
              </span>
            )}
          </div>
          {calRemaining != null && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                calOver
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
              )}
            >
              {calOver
                ? `${Math.round(totals.calories - calTarget!).toLocaleString()} over`
                : `${Math.round(calRemaining).toLocaleString()} left`}
            </span>
          )}
        </div>
        {calPct != null && (
          <ProgressBar value={calPct} color={calOver ? "red" : "indigo"} size="sm" />
        )}
      </div>

      {/* P / C / F tiles — equal width grid */}
      <div className="grid grid-cols-3 gap-2">
        <MacroTile
          label="Protein"
          value={totals.protein_g}
          target={targets?.protein_g}
          color="blue"
        />
        <MacroTile label="Carbs" value={totals.carbs_g} target={targets?.carbs_g} color="orange" />
        <MacroTile label="Fat" value={totals.fat_g} target={targets?.fat_g} color="violet" />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const TILE_COLORS = {
  blue: "text-blue-600 dark:text-blue-400",
  orange: "text-orange-600 dark:text-orange-400",
  violet: "text-violet-600 dark:text-violet-400",
} as const;

const PROGRESS_COLORS = {
  blue: "blue",
  orange: "orange",
  violet: "violet",
} as const satisfies Record<keyof typeof TILE_COLORS, "blue" | "orange" | "violet">;

function MacroTile({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number | null | undefined;
  color: keyof typeof TILE_COLORS;
}) {
  const hasTarget = target != null && target > 0;
  const pct = hasTarget ? Math.min(100, (value / target!) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/40">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
          {label}
        </span>
        {hasTarget && (
          <span className="text-[10px] text-gray-400 tabular-nums">/{Math.round(target!)}g</span>
        )}
      </div>
      <p className={cn("text-base font-bold tabular-nums", TILE_COLORS[color])}>
        {Math.round(value)}
        <span className="ml-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">g</span>
      </p>
      {hasTarget && <ProgressBar value={pct} size="sm" color={PROGRESS_COLORS[color]} />}
    </div>
  );
}
