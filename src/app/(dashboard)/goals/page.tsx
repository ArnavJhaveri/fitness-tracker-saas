"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GoalCard } from "@/features/goals/components/GoalCard";
import { GoalForm } from "@/features/goals/components/GoalForm";
import { useGoals } from "@/features/goals/hooks/useGoals";
import type { Goal } from "@/types/database";

const STATUS_TABS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: undefined, label: "All" },
] as const;

export default function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>("active");
  const [showForm, setShowForm] = useState(false);

  // Fetch all goals once and filter client-side — avoids two parallel requests
  // and keeps summary counts accurate regardless of the active tab.
  const { data: allGoals = [], isLoading } = useGoals(undefined);
  const goals =
    statusFilter !== undefined ? allGoals.filter((g: Goal) => g.status === statusFilter) : allGoals;
  const activeCount = allGoals.filter((g: Goal) => g.status === "active").length;
  const completedCount = allGoals.filter((g: Goal) => g.status === "completed").length;

  return (
    <div className="flex flex-col">
      <Header title="Goals" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active goals</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedCount}
            </p>
          </Card>
        </div>

        {/* New goal form */}
        {showForm ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New goal</CardTitle>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <GoalForm onSuccess={() => setShowForm(false)} />
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" /> New goal
          </Button>
        )}

        {/* Goals list */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Goals</CardTitle>
              {/* Status filter tabs */}
              <div
                role="tablist"
                aria-label="Filter goals by status"
                className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
              >
                {STATUS_TABS.map((tab) => (
                  <button
                    key={String(tab.value)}
                    role="tab"
                    aria-selected={statusFilter === tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === tab.value
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : goals.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No goals yet"
                description={
                  statusFilter === "active"
                    ? "Set your first goal to start tracking progress."
                    : "Nothing here yet."
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {goals.map((goal: Goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
