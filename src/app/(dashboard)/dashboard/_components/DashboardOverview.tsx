"use client";

import { Dumbbell, Utensils, Moon, Droplets, Flame, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useTodaySummary, useThirtyDaySummary } from "@/features/analytics/hooks/useAnalytics";
import { WeeklyBarChart } from "@/features/analytics/components/WeeklyBarChart";
import { calcWorkoutStreak } from "@/features/analytics/utils/streaks";

// ─── Stat card ────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit: string;
  color: keyof typeof COLOR_MAP;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${COLOR_MAP[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="text-xs text-gray-400">{unit}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { today, isLoading: todayLoading } = useTodaySummary();
  const { data: thirtyDays, isLoading: historyLoading } = useThirtyDaySummary();

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

  // Show "—" when the value is 0 (nothing logged yet) not just when today is null
  const sleepHours =
    today && today.total_sleep_minutes > 0 ? (today.total_sleep_minutes / 60).toFixed(1) : "—";
  const calories = today && today.total_calories > 0 ? Math.round(today.total_calories) : "—";
  const waterMl = today && today.total_water_ml > 0 ? today.total_water_ml.toLocaleString() : "—";
  const workouts = today ? today.workout_count : "—";

  return (
    <div className="flex flex-col gap-6">
      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Dumbbell} label="Workouts" value={workouts} unit="today" color="indigo" />
        <StatCard icon={Utensils} label="Calories" value={calories} unit="kcal" color="orange" />
        <StatCard icon={Moon} label="Sleep" value={sleepHours} unit="hrs" color="violet" />
        <StatCard icon={Droplets} label="Water" value={waterMl} unit="ml" color="blue" />
      </div>

      {/* Streak + weekly activity */}
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
              <WeeklyBarChart summaries={thirtyDays} height={140} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
