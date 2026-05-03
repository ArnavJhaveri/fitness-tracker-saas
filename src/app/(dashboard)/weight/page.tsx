"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeightLogForm } from "@/features/weight/components/WeightLogForm";
import { WeightTrendChart } from "@/features/weight/components/WeightTrendChart";
import { WeightHistoryList } from "@/features/weight/components/WeightHistoryList";
import { useWeightEntries } from "@/features/weight/hooks/useWeight";

export default function WeightPage() {
  const { data: entries = [], isLoading } = useWeightEntries();

  const latest =
    entries.length > 0
      ? [...entries].sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0]
      : null;

  return (
    <div className="flex flex-col">
      <Header title="Weight" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">Latest</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {latest ? `${latest.weight_kg} kg` : "—"}
              </p>
            )}
          </Card>
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">Entries logged</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {entries.length}
              </p>
            )}
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Body fat</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {latest?.body_fat_percentage != null ? `${latest.body_fat_percentage}%` : "—"}
              </p>
            )}
          </Card>
        </div>

        {/* Trend chart */}
        {(isLoading || entries.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Trend (last 60 entries)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[220px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
              ) : (
                <WeightTrendChart entries={entries} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Log form */}
        <Card>
          <CardHeader>
            <CardTitle>Log weight</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightLogForm />
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : (
              <WeightHistoryList entries={entries} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
