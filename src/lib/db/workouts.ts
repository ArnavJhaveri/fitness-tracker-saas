/**
 * Workout repository — all database access for the workout domain.
 *
 * Routes stay thin HTTP adapters; all SQL lives here.
 * Each function is independently testable and has no HTTP awareness.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/lib/errors";
import type { WorkoutSession, WorkoutExercise, ExerciseSet } from "@/types/database";
import type {
  CreateWorkoutSessionInput,
  UpdateWorkoutSessionInput,
  AddExerciseToWorkoutInput,
  CreateSetInput,
} from "@/lib/validations/workout";

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function listWorkoutSessions(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; per_page: number; from?: string; to?: string },
): Promise<{ data: WorkoutSession[]; count: number }> {
  let query = supabase
    .from("workout_sessions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

  if (params.from) query = query.gte("started_at", params.from);
  if (params.to) query = query.lte("started_at", params.to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as WorkoutSession[], count: count ?? 0 };
}

export async function getWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<
  WorkoutSession & { workout_exercises: (WorkoutExercise & { exercise_sets: ExerciseSet[] })[] }
> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      `
      *,
      workout_exercises (
        *,
        exercises ( id, name, category, primary_muscle_group ),
        exercise_sets ( * )
      )
    `,
    )
    .eq("id", id)
    .eq("user_id", userId)
    .order("order_index", { referencedTable: "workout_exercises", ascending: true })
    .single();

  if (error || !data) throw new NotFoundError("Workout session");

  // Sort exercise sets by set_number client-side (Supabase JS v2 does not
  // support dot-path referencedTable for deeply nested relations)
  const session = data as WorkoutSession & {
    workout_exercises: (WorkoutExercise & { exercise_sets: ExerciseSet[] })[];
  };
  session.workout_exercises?.forEach((we) => {
    we.exercise_sets?.sort((a, b) => a.set_number - b.set_number);
  });
  return session;
}

export async function createWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  input: CreateWorkoutSessionInput,
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

export async function updateWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: UpdateWorkoutSessionInput,
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Workout session");
  return data as WorkoutSession;
}

export async function deleteWorkoutSession(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── Exercises within a session ───────────────────────────────────────────────

export async function addExerciseToSession(
  supabase: SupabaseClient,
  sessionId: string,
  input: AddExerciseToWorkoutInput,
): Promise<WorkoutExercise> {
  const { data, error } = await supabase
    .from("workout_exercises")
    .insert({ ...input, workout_session_id: sessionId })
    .select(`*, exercises ( id, name, category, primary_muscle_group )`)
    .single();
  if (error) throw error;
  return data as WorkoutExercise;
}

export async function removeExerciseFromSession(
  supabase: SupabaseClient,
  exerciseId: string,
  sessionId: string,
): Promise<void> {
  // Scope the delete to both exerciseId AND sessionId so a user cannot delete
  // an exercise that belongs to a different session by guessing the exerciseId.
  const { error } = await supabase
    .from("workout_exercises")
    .delete()
    .eq("id", exerciseId)
    .eq("workout_session_id", sessionId);
  if (error) throw error;
}

// ─── Sets within an exercise ──────────────────────────────────────────────────

export async function addSet(
  supabase: SupabaseClient,
  workoutExerciseId: string,
  input: CreateSetInput,
): Promise<ExerciseSet> {
  const { data, error } = await supabase
    .from("exercise_sets")
    .insert({ ...input, workout_exercise_id: workoutExerciseId })
    .select()
    .single();
  if (error) throw error;
  return data as ExerciseSet;
}

export async function updateSet(
  supabase: SupabaseClient,
  setId: string,
  workoutExerciseId: string,
  input: Partial<CreateSetInput>,
): Promise<ExerciseSet> {
  // Scope the update to both setId AND workoutExerciseId so a user cannot
  // modify a set that belongs to a different exercise by guessing the setId.
  const { data, error } = await supabase
    .from("exercise_sets")
    .update(input)
    .eq("id", setId)
    .eq("workout_exercise_id", workoutExerciseId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Exercise set");
  return data as ExerciseSet;
}

export async function deleteSet(
  supabase: SupabaseClient,
  setId: string,
  workoutExerciseId: string,
): Promise<void> {
  // Scope the delete to both setId AND workoutExerciseId so a user cannot
  // delete a set belonging to a different exercise by guessing the setId.
  const { error } = await supabase
    .from("exercise_sets")
    .delete()
    .eq("id", setId)
    .eq("workout_exercise_id", workoutExerciseId);
  if (error) throw error;
}
