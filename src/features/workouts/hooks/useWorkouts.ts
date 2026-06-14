"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutService } from "@/services/workout.service";
import { queryKeys, invalidateWithAnalytics } from "@/lib/query-keys";

/** @deprecated Use `queryKeys.workouts()` from `@/lib/query-keys` instead. */
export const WORKOUTS_KEY = queryKeys.workouts();

export function useWorkoutSessions() {
  return useQuery({
    queryKey: queryKeys.workouts(),
    queryFn: () => workoutService.list({ per_page: 20 }),
    staleTime: 60_000,
  });
}

export function useWorkoutSession(id: string) {
  return useQuery({
    queryKey: queryKeys.workout(id),
    queryFn: () => workoutService.get(id),
    enabled: !!id,
    staleTime: 30_000, // don't refetch on every focus — mutations invalidate explicitly
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workoutService.create,
    onSuccess: () => {
      invalidateWithAnalytics(qc, queryKeys.workouts());
    },
  });
}

export function useFinishWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ended_at }: { id: string; ended_at: string }) =>
      workoutService.update(id, { ended_at }),
    onSuccess: (_data, { id }) => {
      invalidateWithAnalytics(qc, queryKeys.workouts(), queryKeys.workout(id));
    },
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workoutService.delete(id),
    onSuccess: () => {
      invalidateWithAnalytics(qc, queryKeys.workouts());
    },
  });
}

export function useAddExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: { exercise_id: string; order_index: number; notes?: string | null };
    }) => workoutService.addExercise(sessionId, data),
    onSuccess: (_data, { sessionId }) => {
      // Invalidate both the specific session view AND the session list —
      // the list may embed exercise counts or aggregate data.
      qc.invalidateQueries({ queryKey: queryKeys.workout(sessionId) });
      qc.invalidateQueries({ queryKey: queryKeys.workouts() });
    },
  });
}

export function useAddSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      exerciseId,
      data,
    }: {
      sessionId: string;
      exerciseId: string;
      data: Parameters<typeof workoutService.addSet>[2];
    }) => workoutService.addSet(sessionId, exerciseId, data),
    onSuccess: (_data, { sessionId }) => {
      // Sets contribute to workout volume/duration reflected in analytics.
      invalidateWithAnalytics(qc, queryKeys.workout(sessionId), queryKeys.workouts());
    },
  });
}

export function useDeleteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      exerciseId,
      setId,
    }: {
      sessionId: string;
      exerciseId: string;
      setId: string;
    }) => workoutService.deleteSet(sessionId, exerciseId, setId),
    onSuccess: (_data, { sessionId }) => {
      invalidateWithAnalytics(qc, queryKeys.workout(sessionId), queryKeys.workouts());
    },
  });
}
