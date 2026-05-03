"use client";

import { Trash2 } from "lucide-react";
import { useWaterEntries, useDeleteWater } from "../hooks/useWater";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Droplets } from "lucide-react";

export function WaterHistory() {
  const { data: entries, isLoading } = useWaterEntries();
  const { mutate: deleteEntry } = useDeleteWater();

  if (isLoading) return <Skeleton lines={4} />;
  if (!entries?.length)
    return (
      <EmptyState
        icon={Droplets}
        title="No water logged today"
        description="Use the buttons above to log your intake."
      />
    );

  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50"
        >
          <div className="flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {entry.amount_ml} ml
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {new Date(entry.logged_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={() => deleteEntry(entry.id)}
              aria-label="Delete entry"
              className="text-gray-300 transition-colors hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
