"use client";

import { useMemo } from "react";
import { Dumbbell, Utensils, Moon, Droplets, Flame, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { useTodaySummary, useThirtyDaySummary } from "@/features/analytics/hooks/useAnalytics";
import { LazyWeeklyBarChart } from "@/features/analytics/components/LazyCharts";
import { calcWorkoutStreak } from "@/features/analytics/utils/streaks";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useActivePhase } from "@/features/phases/hooks/usePhases";
import { useResolvedTargets } from "@/features/phases/hooks/useResolvedTargets";
import { PhaseProgressCard } from "@/features/phases/components/PhaseProgressCard";
import {
  NUTRITION_INTENTS,
  SLEEP_INTENTS,
  WATER_INTENTS,
  WORKOUT_INTENTS,
  widgetEnabled,
} from "@/components/dashboard/widgetVisibility";
import type { DailySummary } from "@/types/database";

// ─── Recent-data probes ───────────────────────────────────────────────────────

function hasAnyMeal(summaries: DailySummary[] | undefined): boolean {
  return Boolean(summaries?.some((d) => d.total_calories > 0));
}
function hasAnyWorkout(summaries: DailySummary[] | undefined): boolean {
  return Boolean(summaries?.some((d) => d.workout_count > 0));
}
function hasAnySleep(summaries: DailySummary[] | undefined): boolean {
  return Boolean(summaries?.some((d) => d.total_sleep_minutes > 0));
}
function hasAnyWater(summaries: DailySummary[] | undefined): boolean {
  return Boolean(summaries?.some((d) => d.total_water_ml > 0));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { today, isLoading: todayLoading } = useTodaySummary();
  const { data: thirtyDays, isLoading: historyLoading } = useThirtyDaySummary();
  const { data: settings } = useSettings();
  const { data: activePhase } = useActivePhase();
  const { data: targets } = useResolvedTargets();

  const intents = settings?.primary_intents ?? null;

  const visibility = useMemo(
    () => ({
      workouts: widgetEnabled(WORKOUT_INTENTS, intents, hasAnyWorkout(thirtyDays)),
      nutrition: widgetEnabled(NUTRITION_INTENTS, intents, hasAnyMeal(thirtyDays)),
      sleep: widgetEnabled(SLEEP_INTENTS, intents, hasAnySleep(thirtyDays)),
      water: widgetEnabled(WATER_INTENTS, intents, hasAnyWater(thirtyDays)),
    }),
    [intents, thirtyDays],
  );

  const streak = thirtyDays ? calcWorkoutStreak(thirtyDays) : 0;

  if (todayLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // The order of stat cards matches the icon palette used elsewhere in the
  // app for visual consistency. Each card decides its own "—" placeholder
  // when no value is logged today.
  const cards: { key: keyof typeof visibility; node: React.ReactNode }[] = [
    {
      key: "workouts",
      node: (
        <StatCard
          icon={Dumbbell}
          label="Workouts"
          value={today?.workout_count ?? null}
          format={(n) => String(n)}
          unit="today"
          color="indigo"
          emptyLabel="logged"
        />
      ),
    },
    {
      key: "nutrition",
      node: (
        <StatCard
          icon={Utensils}
          label="Calories"
          value={today?.total_calories ?? null}
          format={(n) => Math.round(n).toLocaleString()}
          unit="kcal"
          target={targets?.daily_calorie_target ?? null}
          color="orange"
          emptyLabel="today"
        />
      ),
    },
    {
      key: "sleep",
      node: (
        <StatCard
          icon={Moon}
          label="Sleep"
          value={today?.total_sleep_minutes ?? null}
          format={(min) => (min / 60).toFixed(1)}
          unit="hrs"
          target={targets?.sleep_target_minutes != null ? targets.sleep_target_minutes : null}
          color="violet"
          emptyLabel="last night"
        />
      ),
    },
    {
      key: "water",
      node: (
        <StatCard
          icon={Droplets}
          label="Water"
          value={today?.total_water_ml ?? null}
          format={(n) => n.toLocaleString()}
          unit="ml"
          target={targets?.daily_water_target_ml ?? null}
          color="blue"
          emptyLabel="today"
        />
      ),
    },
  ];

  const visibleCards = cards.filter((c) => visibility[c.key]);
  const allEmpty = visibleCards.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Phase progress hero — only when an active phase exists */}
      {activePhase && <PhaseProgressCard phase={activePhase} />}

      {/* Today's stats — laid out 2-up on mobile, 4-up on lg+. Companion-mode
          users may see fewer cards; we expand to fill available space. */}
      {!allEmpty && (
        <div
          className={`grid gap-4 ${
            visibleCards.length >= 3 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          {visibleCards.map(({ key, node }) => (
            <div key={key}>{node}</div>
          ))}
        </div>
      )}

      {/* Edge case: a brand-new companion-mode user with no intents picked
          AND no logged data. Show a friendly "ready to log" prompt so the
          dashboard isn't empty on first sign-in. */}
      {allEmpty && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Sparkles className="h-8 w-8 text-indigo-400" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            Nothing logged yet
          </p>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            Pick any tracker from the sidebar to get started — workouts, meals, sleep, water,
            weight, all of it. Your dashboard will fill in as you go.
          </p>
        </Card>
      )}

      {/* Streak + weekly activity — only show when workout tracking is active.
          A user who only tracks nutrition shouldn't see workout charts. */}
      {visibility.workouts && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Workout streak</p>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {streak}
              <span className="ml-1 text-base font-normal text-gray-400">days</span>
            </p>
            <p className="text-xs text-gray-400">Consecutive days with a workout</p>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                This week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading || !thirtyDays ? (
                <div className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
              ) : (
                <LazyWeeklyBarChart summaries={thirtyDays} height={140} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
