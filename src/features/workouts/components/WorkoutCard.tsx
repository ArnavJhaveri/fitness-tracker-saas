"use client";

import { Trash2, ChevronRight, Clock, Dumbbell } from "lucide-react";
import type { WorkoutSession } from "@/types/database";
import { useDeleteWorkout } from "../hooks/useWorkouts";

interface Props {
  session: WorkoutSession;
  onClick?: () => void;
}

export function WorkoutCard({ session, onClick }: Props) {
  const { mutate: deleteSession } = useDeleteWorkout();

  function handleDelete() {
    if (!window.confirm(`Delete "${session.name}"? This cannot be undone.`)) return;
    deleteSession(session.id, {
      onError: () =>
        window.alert("Failed to delete workout. Please try again or refresh the page."),
    });
  }

  const isActive = !session.ended_at;
  const duration = (() => {
    if (!session.duration_minutes) return null;
    const h = Math.floor(session.duration_minutes / 60);
    const m = session.duration_minutes % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  })();

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isActive
            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        }`}
      >
        <Dumbbell className="h-5 w-5" />
      </div>

      <button onClick={onClick} className="flex flex-1 flex-col items-start gap-0.5 text-left">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {session.name}
          {isActive && (
            <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Active
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {new Date(session.started_at).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
          {duration && ` · ${duration}`}
        </span>
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          aria-label={`Delete workout ${session.name}`}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-400 dark:hover:bg-gray-700"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        {onClick && <ChevronRight className="h-4 w-4 text-gray-300" />}
      </div>
    </div>
  );
}
