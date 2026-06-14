"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ExerciseForm } from "@/features/exercises/components/ExerciseForm";
import { useAddExercise } from "@/features/workouts/hooks/useWorkouts";
import { workoutService } from "@/services/workout.service";
import type { Exercise } from "@/types/database";

interface Props {
  sessionId: string;
  orderIndex: number;
}

export function ExercisePicker({ sessionId, orderIndex }: Props) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: results = [], isFetching } = useQuery<Exercise[]>({
    queryKey: ["exercise-search", submitted],
    queryFn: () => workoutService.searchExercises(submitted),
    enabled: submitted.length >= 2,
    staleTime: 60_000,
  });

  const { mutate: addExercise, isPending } = useAddExercise();

  function handleAdd(exercise: Exercise) {
    addExercise({ sessionId, data: { exercise_id: exercise.id, order_index: orderIndex } });
    setQuery("");
    setSubmitted("");
  }

  function handleCreateSuccess(exercise: Exercise) {
    setCreating(false);
    handleAdd(exercise);
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
            New custom exercise
          </p>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="text-xs text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100"
          >
            Cancel
          </button>
        </div>
        <ExerciseForm onCancel={() => setCreating(false)} onSuccess={handleCreateSuccess} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          aria-label="Search exercises"
          placeholder="Search exercises (e.g. bench press)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSubmitted(query)}
          className="h-9 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          onClick={() => setSubmitted(query)}
          disabled={isFetching || query.length < 2}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      {submitted && results.length === 0 && !isFetching && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No exercises found for &quot;{submitted}&quot;.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <Plus className="h-3.5 w-3.5" /> Create &quot;{submitted}&quot; as a custom exercise
          </button>
        </div>
      )}

      {results.length > 0 && (
        <>
          <ul className="flex flex-col gap-1 rounded-lg border border-gray-100 dark:border-gray-700">
            {results.map((ex) => (
              <li key={ex.id}>
                <button
                  onClick={() => handleAdd(ex)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-700/30"
                >
                  <span className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                    {ex.name}
                    {ex.is_custom && (
                      <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-indigo-700 uppercase dark:bg-indigo-900/30 dark:text-indigo-300">
                        Custom
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">{ex.primary_muscle_group}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="self-start text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            + Create a custom exercise instead
          </button>
        </>
      )}
    </div>
  );
}
