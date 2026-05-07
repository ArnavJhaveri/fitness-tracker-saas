"use client";

import { Flame, Droplets, Moon, TrendingUp, TrendingDown, Minus, Award } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { LazyWeeklyBarChart, LazyTrendLineChart } from "@/features/analytics/components/LazyCharts";
import { useThirtyDaySummary } from "@/features/analytics/hooks/useAnalytics";
import {
  calcWorkoutStreak,
  calcLongestWorkoutStreak,
  calcWaterStreak,
} from "@/features/analytics/utils/streaks";
import {
  workoutAdherence,
  waterAdherence,
  sleepAdherence,
  overallScore,
} from "@/features/analytics/utils/adherence";
import {
  movingAverage,
  periodDelta,
  formatDelta,
  trendDirection,
  latestWeight,
} from "@/features/analytics/utils/trends";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useActivePhase } from "@/features/phases/hooks/usePhases";
import type { DailySummary } from "@/types/database";

// ─── Trend direction icon ──────────────────────────────────────────────────────

function DeltaBadge({ delta, invert = false }: { delta: number; invert?: boolean }) {
  const dir = trendDirection(delta);
  const positive = invert ? dir === "down" : dir === "up";
  const negative = invert ? dir === "up" : dir === "down";

  if (dir === "flat")
    return (
      <span className="flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="h-3 w-3" /> {formatDelta(delta)}
      </span>
    );

  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${positive ? "text-green-500" : negative ? "text-red-400" : "text-gray-400"}`}
    >
      {dir === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {formatDelta(delta)}
    </span>
  );
}

// ─── Adherence ring ────────────────────────────────────────────────────────────

function AdherenceCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "indigo" | "blue" | "violet" | "green";
}) {
  return (
    <div className="flex flex-col gap-2">
      <ProgressBar value={value} label={label} color={color} showPercent size="sm" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: summaries = [], isLoading } = useThirtyDaySummary();
  const { data: settings } = useSettings();
  const { data: activePhase } = useActivePhase();

  // Resolve targets — phase overrides settings per field. We keep this
  // resolution inline (rather than calling useResolvedTargets) because the
  // analytics page reads each field with a different fallback default, and
  // the latest-active-phase view is correct for "the past 30 days" only
  // when the phase covers them. For per-day historical accuracy, the
  // resolveDailyTargets server helper is the right tool — the page
  // currently uses one snapshot for simplicity.
  const waterMl = activePhase?.daily_water_target_ml ?? settings?.daily_water_target_ml ?? 2000;
  const sleepMinutes = settings?.sleep_target_minutes ?? 480;
  // weekly_workout_target on phases is a session count; user_settings has
  // weekly_workout_hours_target (a duration). The adherence calc takes a
  // session count, so we use the phase column when present and fall back
  // to a sensible default.
  const workoutsPerWeek = activePhase?.weekly_workout_target ?? 4;

  // ── Streaks ──
  const workoutStreak = summaries.length ? calcWorkoutStreak(summaries) : 0;
  const longestStreak = summaries.length ? calcLongestWorkoutStreak(summaries) : 0;
  const waterStreak = summaries.length ? calcWaterStreak(summaries, waterMl) : 0;

  // ── Adherence ──
  const workoutAdh = workoutAdherence(summaries, workoutsPerWeek);
  const waterAdh = waterAdherence(summaries, waterMl);
  const sleepAdh = sleepAdherence(summaries, sleepMinutes);
  const overall = overallScore([workoutAdh, waterAdh, sleepAdh]);

  // ── Trend data for charts ──
  const sorted = [...summaries].sort((a: DailySummary, b: DailySummary) =>
    a.log_date.localeCompare(b.log_date),
  );

  const waterData = sorted.map((d) => ({ date: d.log_date.slice(5), value: d.total_water_ml }));
  const sleepData = sorted.map((d) => ({
    date: d.log_date.slice(5),
    value: d.total_sleep_minutes > 0 ? Math.round((d.total_sleep_minutes / 60) * 10) / 10 : null,
  }));
  const calorieData = sorted.map((d) => ({
    date: d.log_date.slice(5),
    value: d.total_calories > 0 ? Math.round(d.total_calories) : null,
  }));

  // Weight trend via moving average — pass null for days with no entry so they
  // don't drag the average toward zero (movingAverage skips nulls per window).
  const weightValues = sorted.map((d) => d.weight_kg ?? null);
  const weightMA = movingAverage(sorted, weightValues, 7).map((p) => ({
    date: p.date.slice(5),
    value: p.value,
  }));

  // Period deltas (last 7 vs prior 7)
  const waterDelta = periodDelta(sorted.map((d) => d.total_water_ml));
  const sleepDelta = periodDelta(sorted.map((d) => d.total_sleep_minutes));
  const calorieDelta = periodDelta(sorted.map((d) => d.total_calories));

  const currentWeight = latestWeight(summaries);

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Analytics" />
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Analytics" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Overall score + streaks */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Health score</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {overall}
              <span className="ml-1 text-sm font-normal text-gray-400">/ 100</span>
            </p>
            <p className="text-xs text-gray-400">30-day average</p>
          </Card>

          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Workout streak</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {workoutStreak}
              <span className="ml-1 text-xs font-normal text-gray-400">days</span>
            </p>
            <p className="text-xs text-gray-400">Best: {longestStreak}d</p>
          </Card>

          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Water streak</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {waterStreak}
              <span className="ml-1 text-xs font-normal text-gray-400">days</span>
            </p>
            <p className="text-xs text-gray-400">≥ {(waterMl / 1000).toFixed(1)}L/day</p>
          </Card>

          <Card className="flex flex-col gap-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Current weight</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {currentWeight != null ? `${currentWeight} kg` : "—"}
            </p>
            <p className="text-xs text-gray-400">Latest entry</p>
          </Card>
        </div>

        {/* Adherence */}
        <Card>
          <CardHeader>
            <CardTitle>30-day adherence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <AdherenceCard label="Workouts" value={workoutAdh} color="indigo" />
              <AdherenceCard label="Hydration" value={waterAdh} color="blue" />
              <AdherenceCard label="Sleep" value={sleepAdh} color="violet" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly workout bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Weekly workouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LazyWeeklyBarChart summaries={summaries} height={150} />
          </CardContent>
        </Card>

        {/* Water trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                Water intake
              </CardTitle>
              <DeltaBadge delta={waterDelta} />
            </div>
          </CardHeader>
          <CardContent>
            <LazyTrendLineChart
              data={waterData}
              color="#3b82f6"
              label="Water"
              unit=" ml"
              height={160}
            />
          </CardContent>
        </Card>

        {/* Sleep trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-violet-500" />
                Sleep duration
              </CardTitle>
              <DeltaBadge delta={sleepDelta} />
            </div>
          </CardHeader>
          <CardContent>
            <LazyTrendLineChart
              data={sleepData}
              color="#8b5cf6"
              label="Sleep"
              unit="h"
              height={160}
            />
          </CardContent>
        </Card>

        {/* Calories trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Calories</CardTitle>
              <DeltaBadge delta={calorieDelta} />
            </div>
          </CardHeader>
          <CardContent>
            <LazyTrendLineChart
              data={calorieData}
              color="#f97316"
              label="Calories"
              unit=" kcal"
              height={160}
            />
          </CardContent>
        </Card>

        {/* Weight 7-day moving average */}
        {weightMA.some((p) => p.value != null) && (
          <Card>
            <CardHeader>
              <CardTitle>Weight trend (7-day avg)</CardTitle>
            </CardHeader>
            <CardContent>
              <LazyTrendLineChart
                data={weightMA}
                color="#6366f1"
                label="Weight"
                unit=" kg"
                height={160}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
