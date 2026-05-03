"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Dumbbell, Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StartWorkoutModal } from "@/features/workouts/components/StartWorkoutModal";
import { WorkoutCard } from "@/features/workouts/components/WorkoutCard";
import { SetLogRow } from "@/features/workouts/components/SetLogRow";
import {
  useWorkoutSessions,
  useWorkoutSession,
  useFinishWorkout,
  useAddExercise,
} from "@/features/workouts/hooks/useWorkouts";
import { workoutService } from "@/services/workout.service";
import type { Exercise, ExerciseSet, WorkoutExercise } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type FullExercise = WorkoutExercise & { exercises?: Exercise; exercise_sets: ExerciseSet[] };

// ─── Exercise picker ──────────────────────────────────────────────────────────

function ExercisePicker({ sessionId, orderIndex }: { sessionId: string; orderIndex: number }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

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
        <p className="text-sm text-gray-400">No exercises found for &quot;{submitted}&quot;</p>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-gray-100 dark:border-gray-700">
          {results.map((ex) => (
            <li key={ex.id}>
              <button
                onClick={() => handleAdd(ex)}
                disabled={isPending}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-700/30"
              >
                <span className="font-medium text-gray-800 dark:text-gray-200">{ex.name}</span>
                <span className="text-xs text-gray-400">{ex.primary_muscle_group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Workout detail view ──────────────────────────────────────────────────────

function WorkoutDetailView({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkoutsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: sessions = [], isLoading } = useWorkoutSessions();

  // useState lazy init runs once at mount — the only React-sanctioned place for
  // impure calls like Date.now() that the react-hooks/purity rule permits.
  const [now] = useState(() => Date.now());

  const activeSession = sessions.find((s) => !s.ended_at);
  const thisWeek = sessions.filter((s) => {
    const daysAgo = (now - new Date(s.started_at).getTime()) / 86_400_000;
    return daysAgo <= 7;
  }).length;

  if (selectedId) {
    return (
      <div className="flex flex-col">
        <Header title="Workouts" />
        <div className="p-4 sm:p-6">
          <WorkoutDetailView sessionId={selectedId} onBack={() => setSelectedId(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Workouts" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">This week</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{thisWeek}</p>
            )}
            <p className="text-xs text-gray-400">workouts</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active session</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {activeSession ? "In progress" : "None"}
              </p>
            )}
          </Card>
        </div>

        {/* Start workout */}
        {showForm ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Start workout</CardTitle>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <StartWorkoutModal
                onSuccess={(id) => {
                  setShowForm(false);
                  setSelectedId(id);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" /> Start workout
          </Button>
        )}

        {/* Session list */}
        <Card>
          <CardHeader>
            <CardTitle>Recent workouts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No workouts yet"
                description="Start your first workout session above."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {sessions.map((session) => (
                  <WorkoutCard
                    key={session.id}
                    session={session}
                    onClick={() => setSelectedId(session.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
