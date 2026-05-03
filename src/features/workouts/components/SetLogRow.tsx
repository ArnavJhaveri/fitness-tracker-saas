"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ExerciseSet, WorkoutExercise, Exercise } from "@/types/database";
import { useAddSet, useDeleteSet } from "../hooks/useWorkouts";

type FullExercise = WorkoutExercise & { exercises?: Exercise; exercise_sets: ExerciseSet[] };

interface Props {
  sessionId: string;
  workoutExercise: FullExercise;
}

export function SetLogRow({ sessionId, workoutExercise }: Props) {
  const [reps, setReps] = useState("");
  const [kg, setKg] = useState("");
  const [isWarmup, setWarmup] = useState(false);

  const { mutate: addSet, isPending } = useAddSet();
  const { mutate: deleteSet } = useDeleteSet();

  const sets = workoutExercise.exercise_sets ?? [];

  function handleAdd() {
    const setNumber = sets.length + 1;
    addSet({
      sessionId,
      exerciseId: workoutExercise.id,
      data: {
        set_number: setNumber,
        reps: reps ? parseInt(reps) : null,
        weight_kg: kg ? parseFloat(kg) : null,
        is_warmup: isWarmup,
      },
    });
    setReps("");
    setKg("");
    setWarmup(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4 dark:border-gray-700">
      <p className="font-medium text-gray-900 dark:text-gray-100">
        {workoutExercise.exercises?.name ?? "Exercise"}
      </p>

      {/* Logged sets */}
      {sets.length > 0 && (
        <div className="flex flex-col gap-1">
          {sets.map((set) => (
            <div key={set.id} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-xs text-gray-400">#{set.set_number}</span>
              {set.weight_kg !== null && <span className="font-medium">{set.weight_kg} kg</span>}
              {set.reps !== null && <span className="text-gray-500">× {set.reps} reps</span>}
              {set.is_warmup && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Warmup
                </span>
              )}
              <button
                onClick={() =>
                  deleteSet({ sessionId, exerciseId: workoutExercise.id, setId: set.id })
                }
                className="ml-auto text-gray-300 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Log new set */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="kg"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          className="h-9 w-20 rounded-lg border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          type="number"
          placeholder="reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="h-9 w-20 rounded-lg border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={isWarmup}
            onChange={(e) => setWarmup(e.target.checked)}
            className="rounded"
          />
          Warmup
        </label>
        <button
          onClick={handleAdd}
          disabled={isPending || (!reps && !kg)}
          className="ml-auto flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Set
        </button>
      </div>
    </div>
  );
}
