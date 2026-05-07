"use client";

import { Trash2, CheckCircle2 } from "lucide-react";
import type { Goal } from "@/types/database";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useUpdateGoal, useDeleteGoal } from "../hooks/useGoals";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  abandoned: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

interface Props {
  goal: Goal;
}

export function GoalCard({ goal }: Props) {
  const { mutate: updateGoal } = useUpdateGoal();
  const { mutate: deleteGoal } = useDeleteGoal();

  const progress =
    goal.target_value && goal.current_value != null
      ? Math.min(100, (goal.current_value / goal.target_value) * 100)
      : null;

  function markComplete() {
    updateGoal(
      { id: goal.id, data: { status: "completed" } },
      { onError: () => window.alert("Failed to update goal. Please try again.") },
    );
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    deleteGoal(goal.id, {
      onError: () => window.alert("Failed to delete goal. Please try again."),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{goal.title}</h3>
          {goal.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{goal.description}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[goal.status]}`}
        >
          {goal.status}
        </span>
      </div>

      {progress !== null && (
        <ProgressBar
          value={progress}
          sublabel={`${goal.current_value} / ${goal.target_value} ${goal.unit ?? ""}`}
          color={progress >= 100 ? "green" : "indigo"}
          showPercent
        />
      )}

      {goal.target_date && (
        <p className="text-xs text-gray-400">
          {/* Append T12:00:00Z so date-only strings aren't parsed as UTC midnight
              (which shows the previous day in UTC- timezones) */}
          Target:{" "}
          {new Date(goal.target_date + "T12:00:00Z").toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}

      <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        {goal.status === "active" && (
          <button
            onClick={markComplete}
            className="flex items-center gap-1.5 text-xs text-green-600 transition-colors hover:text-green-700 dark:text-green-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
          </button>
        )}
        <button
          onClick={handleDelete}
          aria-label={`Delete goal ${goal.title}`}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}
