"use client";

import { Trash2, Moon } from "lucide-react";
import type { SleepEntry } from "@/types/database";
import { useDeleteSleep } from "../hooks/useSleep";
import { EmptyState } from "@/components/ui/EmptyState";

const QUALITY_LABEL: Record<number, string> = {
  1: "Very poor",
  2: "Poor",
  3: "Fair",
  4: "Good",
  5: "Excellent",
};
const QUALITY_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-amber-500",
  4: "text-blue-500",
  5: "text-green-500",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface Props {
  entries: SleepEntry[];
}

export function SleepHistoryList({ entries }: Props) {
  const { mutate: deleteEntry } = useDeleteSleep();

  if (!entries.length)
    return (
      <EmptyState
        icon={Moon}
        title="No sleep entries yet"
        description="Log your first sleep session above."
      />
    );

  const sorted = [...entries].sort((a, b) => b.sleep_start.localeCompare(a.sleep_start));

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatDuration(entry.duration_minutes)}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(entry.sleep_start).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" → "}
              {new Date(entry.sleep_end).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              {new Date(entry.sleep_start).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {entry.quality && (
              <span className={`text-xs font-medium ${QUALITY_COLOR[entry.quality]}`}>
                {QUALITY_LABEL[entry.quality]}
              </span>
            )}
            <button
              onClick={() => deleteEntry(entry.id)}
              aria-label="Delete sleep entry"
              className="text-gray-300 transition-colors hover:text-red-400 dark:text-gray-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
