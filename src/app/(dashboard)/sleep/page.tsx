"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { SleepLogForm } from "@/features/sleep/components/SleepLogForm";
import { SleepHistoryList } from "@/features/sleep/components/SleepHistoryList";
import { useSleepEntries } from "@/features/sleep/hooks/useSleep";
import { formatDuration } from "@/lib/utils/format";

export default function SleepPage() {
  const { data: entries = [], isLoading } = useSleepEntries();

  // useState lazy init: the only React-sanctioned place for impure calls like
  // Date.now() — runs once at mount, stable across re-renders.
  const [now] = useState(() => Date.now());

  // Last 7 days average
  const last7 = entries.filter((e) => {
    const daysAgo = (now - new Date(e.sleep_start).getTime()) / 86_400_000;
    return daysAgo <= 7;
  });

  const avgMinutes = last7.length
    ? Math.round(last7.reduce((sum, e) => sum + e.duration_minutes, 0) / last7.length)
    : null;

  const avgQuality = last7.filter((e) => e.quality != null).length
    ? (
        last7.filter((e) => e.quality != null).reduce((sum, e) => sum + (e.quality ?? 0), 0) /
        last7.filter((e) => e.quality != null).length
      ).toFixed(1)
    : null;

  return (
    <div className="flex flex-col">
      <Header title="Sleep" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">7-day avg duration</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {avgMinutes != null ? formatDuration(avgMinutes) : "—"}
              </p>
            )}
          </Card>
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">7-day avg quality</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {avgQuality != null ? `${avgQuality} / 5` : "—"}
              </p>
            )}
          </Card>
        </div>

        {/* Log form */}
        <Card>
          <CardHeader>
            <CardTitle>Log sleep</CardTitle>
          </CardHeader>
          <CardContent>
            <SleepLogForm />
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent entries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : (
              <SleepHistoryList entries={entries} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
