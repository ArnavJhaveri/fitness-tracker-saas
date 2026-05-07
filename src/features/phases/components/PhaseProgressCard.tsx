"use client";

import { Calendar, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils/cn";
import { getPhaseTypeMeta, type PhaseTypeMeta } from "@/lib/registry/phase-types";
import type { Phase } from "@/types/database";

/**
 * Tailwind class lookups for the phase type accent colour. Inlining these
 * (rather than templating the colour name into a class string) keeps the JIT
 * compiler aware of every class so they survive the production build's purge.
 */
const ACCENT_BG: Record<PhaseTypeMeta["color"], string> = {
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
};

const BADGE_BG: Record<PhaseTypeMeta["color"], string> = {
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  slate: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

interface Props {
  phase: Phase;
}

/**
 * Hero card on the dashboard for the active phase.
 *
 * Renders three pieces of information depending on what the phase has set:
 *
 *   1. Identity — name + type badge + start date.
 *   2. Time progress — days elapsed / planned total + a progress bar IF
 *      `planned_end_date` is set. Open-ended phases show only the elapsed
 *      counter.
 *   3. Weight target — the weekly delta hint (if set), so users see at a
 *      glance "we're aiming for −0.5 kg/week". Actual progress against
 *      target_weight_kg is computed by the analytics page; this card is
 *      intentionally lightweight.
 *
 * No actions inline — End/Pivot/Edit live on the phase detail page so the
 * dashboard stays uncluttered.
 */
export function PhaseProgressCard({ phase }: Props) {
  const meta = getPhaseTypeMeta(phase.phase_type);

  // ─── Time progress ────────────────────────────────────────────────────
  // Computed on the client side using calendar arithmetic. Both dates are
  // YYYY-MM-DD; treating them as UTC midnight gives stable diffs that don't
  // jitter across DST boundaries. parseUtcDate returns null on malformed
  // input — we render a "started" line without a counter rather than fall
  // back to wall-clock millis (which produced wildly wrong day counts).
  const startUtc = parseUtcDate(phase.start_date);
  const plannedUtc = phase.planned_end_date ? parseUtcDate(phase.planned_end_date) : null;

  // "Today" should be the user's LOCAL calendar day, not UTC. A user in
  // UTC+13 (NZ) at 1am local maps to "yesterday" UTC, so getUTC* functions
  // here would compute Day N-1 for the first ~13 hours of local Day N.
  const localToday = new Date();
  const todayUtc = Date.UTC(localToday.getFullYear(), localToday.getMonth(), localToday.getDate());

  const DAY_MS = 86_400_000;
  const daysElapsed =
    startUtc != null ? Math.max(0, Math.floor((todayUtc - startUtc) / DAY_MS)) : null;
  const totalDays =
    plannedUtc != null && startUtc != null
      ? Math.max(1, Math.floor((plannedUtc - startUtc) / DAY_MS))
      : null;
  const daysRemaining =
    totalDays != null && daysElapsed != null ? Math.max(0, totalDays - daysElapsed) : null;
  const percentComplete =
    totalDays != null && daysElapsed != null
      ? Math.min(100, (daysElapsed / totalDays) * 100)
      : null;

  // ─── Weight delta hint ────────────────────────────────────────────────
  const change = phase.target_weight_change_kg_per_week;
  const showWeightHint = change !== null && Math.abs(change) > 0.05;
  const ChangeIcon = (change ?? 0) < 0 ? TrendingDown : TrendingUp;

  return (
    <Card className="relative overflow-hidden">
      {/* Accent stripe — colour-codes the phase type at a glance */}
      <div
        className={cn("absolute top-0 right-0 left-0 h-1", ACCENT_BG[meta.color])}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-4 pt-2">
        {/* Header: name + badge */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Active phase
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{phase.name}</h3>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              BADGE_BG[meta.color],
            )}
          >
            {meta.label}
          </span>
        </div>

        {/* Time progress */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            {totalDays != null && daysElapsed != null && daysRemaining != null ? (
              <span>
                Day {daysElapsed + 1} of {totalDays} · {daysRemaining} left
              </span>
            ) : daysElapsed != null ? (
              <span>
                Started {formatStart(phase.start_date)} · {daysElapsed} day
                {daysElapsed === 1 ? "" : "s"} in
              </span>
            ) : (
              // Malformed start_date — render the raw value as a graceful fallback
              <span>Started {phase.start_date}</span>
            )}
          </div>
          {percentComplete !== null && <ProgressBar value={percentComplete} color="indigo" />}
        </div>

        {/* Weight delta hint — only when meaningful */}
        {showWeightHint && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <ChangeIcon className="h-3.5 w-3.5 shrink-0" />
            <span>
              Targeting{" "}
              <strong>
                {change! > 0 ? "+" : ""}
                {change} kg
              </strong>{" "}
              per week
              {phase.target_weight_kg ? (
                <>
                  {" "}
                  toward <strong>{phase.target_weight_kg} kg</strong>
                </>
              ) : null}
            </span>
          </div>
        )}

        {/* Calorie target — secondary info, only when set */}
        {phase.daily_calorie_target && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Target className="h-3.5 w-3.5" />
            <span>
              Daily target: <strong>{phase.daily_calorie_target}</strong> kcal
              {phase.daily_protein_target_g ? ` · ${phase.daily_protein_target_g}g protein` : ""}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string as UTC midnight. Plain `new Date("2026-04-22")`
 * already returns UTC midnight, but `Date.parse` semantics for date-only
 * strings have varied across runtimes, so we go through Date.UTC explicitly.
 *
 * Returns null on malformed input. Earlier this fell back to `Date.now()`
 * (current wall-clock millis), which silently turned `daysElapsed` into a
 * very small positive number from the millisecond-since-epoch difference —
 * the displayed "Day 1 of N" was actually meaningless.
 */
function parseUtcDate(yyyyMmDd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Friendly date for the open-ended "Started …" line. Falls back to the raw
 *  YYYY-MM-DD if the locale formatter can't parse it. */
function formatStart(yyyyMmDd: string): string {
  const parsed = parseUtcDate(yyyyMmDd);
  if (parsed == null) return yyyyMmDd;
  return new Date(parsed).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
