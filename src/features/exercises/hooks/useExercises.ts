"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { exercisesService, type ListExercisesParams } from "@/services/exercises.service";
import { queryKeys } from "@/lib/query-keys";
import type { Exercise } from "@/types/database";
import type { CreateExerciseInput, UpdateExerciseInput } from "@/lib/validations";

/** @deprecated Use `queryKeys.exercises()` from `@/lib/query-keys` instead. */
export const EXERCISES_KEY = queryKeys.exercises();

export function useExercises(params: ListExercisesParams = {}) {
  return useQuery<Exercise[]>({
    queryKey: [...queryKeys.exercises(), "list", params],
    queryFn: () => exercisesService.list(params),
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.exercises() });
  // The exercise picker on the workouts page is a separate query
  // (`exercise-search`) — invalidate that too so a freshly-created custom
  // exercise shows up without a manual refresh.
  qc.invalidateQueries({ queryKey: ["exercise-search"] });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation<Exercise, Error, CreateExerciseInput>({
    mutationFn: exercisesService.create,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation<Exercise, Error, { id: string; input: UpdateExerciseInput }>({
    mutationFn: ({ id, input }) => exercisesService.update(id, input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useArchiveExercise() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => exercisesService.archive(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRestoreExercise() {
  const qc = useQueryClient();
  return useMutation<Exercise, Error, string>({
    mutationFn: (id) => exercisesService.restore(id),
    onSuccess: () => invalidateAll(qc),
  });
}
