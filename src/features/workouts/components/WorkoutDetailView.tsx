"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Dumbbell, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SetLogRow } from "@/features/workouts/components/SetLogRow";
import { ExercisePicker } from "@/features/workouts/components/ExercisePicker";
import { useWorkoutSession, useFinishWorkout } from "@/features/workouts/hooks/useWorkouts";
import type { Exercise, ExerciseSet, WorkoutExercise } from "@/types/database";

type FullExercise = WorkoutExercise & { exercises?: Exercise; exercise_sets: ExerciseSet[] };

interface Props {
  sessionId: string;
  onBack: () => void;
}

export function WorkoutDetailView({ sessionId, onBack }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const { data: session, isLoading } = useWorkoutSession(sessionId);
  const { mutate: finishWorkout, isPending: isFinishing } = useFinishWorkout();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!session) return null;

  const isActive = !session.ended_at;
  const exercises =
    (session as typeof session & { workout_exercises: FullExercise[] }).workout_exercises ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {isActive && (
          <Button
            variant="ghost"
            onClick={() => finishWorkout({ id: session.id, ended_at: new Date().toISOString() })}
            isLoading={isFinishing}
            className="flex items-center gap-1.5 text-green-600 hover:text-green-700"
          >
            <CheckCircle2 className="h-4 w-4" /> Finish workout
          </Button>
        )}
      </div>

      {/* Session info */}
      <Card>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{session.name}</h2>
          {isActive && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Active
            </span>
          )}
        </div>
        {session.notes && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{session.notes}</p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Started{" "}
          {new Date(session.started_at).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </Card>

      {/* Exercises */}
      {exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No exercises yet"
          description="Search for an exercise below to add it to this session."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((we) => (
            <SetLogRow key={we.id} sessionId={session.id} workoutExercise={we} />
          ))}
        </div>
      )}

      {/* Add exercise */}
      {isActive && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add exercise</CardTitle>
              <button
                onClick={() => setShowPicker((v) => !v)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <Plus className="h-3.5 w-3.5" />
                {showPicker ? "Cancel" : "Search"}
              </button>
            </div>
          </CardHeader>
          {showPicker && (
            <CardContent>
              <ExercisePicker sessionId={session.id} orderIndex={exercises.length} />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
