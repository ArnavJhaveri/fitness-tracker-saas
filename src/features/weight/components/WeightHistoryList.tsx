"use client";

import { Trash2, Scale } from "lucide-react";
import type { WeightEntry } from "@/types/database";
import { useDeleteWeight } from "../hooks/useWeight";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  entries: WeightEntry[];
}

export function WeightHistoryList({ entries }: Props) {
  const { mutate: deleteEntry } = useDeleteWeight();

  if (!entries.length)
    return (
      <EmptyState
        icon={Scale}
        title="No weight entries yet"
        description="Log your weight above to start tracking your trend."
      />
    );

  const sorted = [...entries].sort((a, b) => b.logged_at.localeCompare(a.logged_at));

  return (
    <ul className="flex flex-col gap-2">
      {sorted.slice(0, 30).map((entry, i) => {
        const prev = sorted[i + 1];
        const delta = prev ? entry.weight_kg - prev.weight_kg : null;

        return (
          <li
            key={entry.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700"
          >
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {entry.weight_kg} kg
                {entry.body_fat_percentage && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {entry.body_fat_percentage}% BF
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(entry.logged_at).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {delta !== null && (
                <span
                  className={`text-xs font-medium ${delta < 0 ? "text-green-500" : delta > 0 ? "text-red-400" : "text-gray-400"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)} kg
                </span>
              )}
              <button
                onClick={() => deleteEntry(entry.id)}
                aria-label="Delete entry"
                className="text-gray-300 transition-colors hover:text-red-400 dark:text-gray-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
