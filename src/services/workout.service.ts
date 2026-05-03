import { apiGet, apiPost, apiPut, apiDelete, buildQuery } from "./api";
import type { WorkoutSession, WorkoutExercise, ExerciseSet, Exercise } from "@/types/database";

interface ListParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
}

export const workoutService = {
  // ─── Sessions ────────────────────────────────────────────────────────────────
  list: (p: ListParams = {}) =>
    apiGet<WorkoutSession[]>(`/api/workouts${buildQuery({ page: 1, per_page: 20, ...p })}`),

  get: (id: string) =>
    apiGet<
      WorkoutSession & { workout_exercises: (WorkoutExercise & { exercise_sets: ExerciseSet[] })[] }
    >(`/api/workouts/${id}`),

  create: (data: {
    name: string;
    notes?: string | null;
    started_at: string;
    ended_at?: string | null;
  }) => apiPost<WorkoutSession>("/api/workouts", data),

  update: (
    id: string,
    data: Partial<{ name: string; notes: string | null; ended_at: string | null }>,
  ) => apiPut<WorkoutSession>(`/api/workouts/${id}`, data),

  delete: (id: string) => apiDelete(`/api/workouts/${id}`),

  // ─── Exercises within session ─────────────────────────────────────────────
  addExercise: (
    sessionId: string,
    data: { exercise_id: string; order_index: number; notes?: string | null },
  ) => apiPost<WorkoutExercise>(`/api/workouts/${sessionId}/exercises`, data),

  removeExercise: (sessionId: string, exerciseId: string) =>
    apiDelete(`/api/workouts/${sessionId}/exercises/${exerciseId}`),

  // ─── Sets ─────────────────────────────────────────────────────────────────
  addSet: (
    sessionId: string,
    exerciseId: string,
    data: {
      set_number: number;
      reps?: number | null;
      weight_kg?: number | null;
      duration_seconds?: number | null;
      distance_meters?: number | null;
      rpe?: number | null;
      is_warmup?: boolean;
    },
  ) => apiPost<ExerciseSet>(`/api/workouts/${sessionId}/exercises/${exerciseId}/sets`, data),

  updateSet: (
    sessionId: string,
    exerciseId: string,
    setId: string,
    data: Partial<{
      reps: number | null;
      weight_kg: number | null;
      rpe: number | null;
      is_warmup: boolean;
    }>,
  ) =>
    apiPut<ExerciseSet>(`/api/workouts/${sessionId}/exercises/${exerciseId}/sets/${setId}`, data),

  deleteSet: (sessionId: string, exerciseId: string, setId: string) =>
    apiDelete(`/api/workouts/${sessionId}/exercises/${exerciseId}/sets/${setId}`),

  // ─── Exercise library search ──────────────────────────────────────────────
  searchExercises: (q: string) =>
    apiGet<Exercise[]>(`/api/exercises${buildQuery({ q, per_page: 20 })}`),
};
