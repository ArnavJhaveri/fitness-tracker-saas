"use client";

import { Archive, ArchiveRestore, Dumbbell, Pencil } from "lucide-react";
import type { Exercise } from "@/types/database";

interface Props {
  exercise: Exercise;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

export function ExerciseRow({ exercise, onEdit, onArchive, onRestore }: Props) {
  const isOwn = exercise.is_custom;
  const isArchived = exercise.archived_at != null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
        <Dumbbell className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name}</p>
          {isOwn && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-indigo-700 uppercase dark:bg-indigo-900/30 dark:text-indigo-300">
              Custom
            </span>
          )}
          {isArchived && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-800 uppercase dark:bg-amber-900/30 dark:text-amber-300">
              Archived
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {capitalize(exercise.category)} · {prettyMuscle(exercise.primary_muscle_group)}
        </p>
        {exercise.instructions && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-400">{exercise.instructions}</p>
        )}
      </div>

      {isOwn && (
        <div className="flex shrink-0 gap-1">
          {isArchived ? (
            <button
              onClick={onRestore}
              aria-label={`Restore ${exercise.name}`}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-emerald-500 dark:hover:bg-gray-700"
            >
              <ArchiveRestore className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                onClick={onEdit}
                aria-label={`Edit ${exercise.name}`}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-500 dark:hover:bg-gray-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onArchive}
                aria-label={`Archive ${exercise.name}`}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-500 dark:hover:bg-gray-700"
              >
                <Archive className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prettyMuscle(m: string) {
  return m.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
