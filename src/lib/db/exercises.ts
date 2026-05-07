/**
 * Exercise repository — all DB access for the exercises domain.
 *
 * The `exercises` table is a hybrid: system-seeded rows (`is_custom = false`,
 * `created_by IS NULL`) are visible to every authenticated user, while
 * custom rows are owner-scoped via RLS. As of migration 003 the table also
 * has `archived_at`: setting it instead of hard-deleting preserves
 * historical workouts that reference the exercise.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Exercise, UUID } from "@/types/database";
import type { CreateExerciseInput, UpdateExerciseInput } from "@/lib/validations/workout";

// ─── List & search ────────────────────────────────────────────────────────────

/**
 * Search the visible exercise library. RLS automatically scopes custom
 * rows to the caller, so this returns:
 *   - all system exercises (is_custom = false)
 *   - the caller's own custom exercises (is_custom = true, created_by = uid)
 *
 * Archived exercises are excluded by default — they remain queryable for
 * historical workouts via `getExercise` but never appear in the picker.
 */
export async function searchExercises(
  supabase: SupabaseClient,
  params: {
    q?: string;
    category?: string;
    muscle?: string;
    page: number;
    per_page: number;
    /** Caller's user_id, used only to ORDER user's custom exercises ahead of
     *  system ones when names match. RLS still scopes the result set. */
    userId: UUID;
    /** Set to `true` to include archived exercises (useful in /exercises
     *  manage page for the archived tab). Defaults to active-only. */
    includeArchived?: boolean;
  },
): Promise<{ data: Exercise[]; count: number }> {
  let query = supabase
    .from("exercises")
    .select("*", { count: "exact" })
    // Surface the user's own custom exercises first — `is_custom = true`
    // sorts higher than `false` when ordering DESC.
    .order("is_custom", { ascending: false })
    .order("name", { ascending: true })
    .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

  if (!params.includeArchived) query = query.is("archived_at", null);
  if (params.q?.trim()) query = query.ilike("name", `%${params.q.trim()}%`);
  if (params.category) query = query.eq("category", params.category);
  if (params.muscle) query = query.eq("primary_muscle_group", params.muscle);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as Exercise[], count: count ?? 0 };
}

/**
 * Read a single exercise by id. Returns archived rows too so historical
 * workout pages can still resolve the name.
 */
export async function getExercise(supabase: SupabaseClient, id: UUID): Promise<Exercise> {
  const { data, error } = await supabase.from("exercises").select("*").eq("id", id).single();
  if (error || !data) throw new NotFoundError("Exercise");
  return data as Exercise;
}

// ─── Mutations (custom exercises only — RLS enforces ownership) ───────────────

export async function createCustomExercise(
  supabase: SupabaseClient,
  userId: UUID,
  input: CreateExerciseInput,
): Promise<Exercise> {
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      ...input,
      // Force these — never trust client-supplied is_custom/created_by
      is_custom: true,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Exercise;
}

/**
 * Update a custom exercise. The RLS policy enforces ownership at the DB
 * level; we additionally verify on the way in so we can surface a clean
 * 404 instead of a Postgres-level RLS deny that surfaces as a 500-ish
 * "0 rows updated" silent fail.
 *
 * System exercises (is_custom = false) cannot be updated. We reject with
 * ValidationError before the round trip.
 */
export async function updateCustomExercise(
  supabase: SupabaseClient,
  userId: UUID,
  id: UUID,
  input: UpdateExerciseInput,
): Promise<Exercise> {
  const existing = await getExercise(supabase, id);
  if (!existing.is_custom || existing.created_by !== userId) {
    throw new ValidationError("Only your own custom exercises can be edited.");
  }
  const { data, error } = await supabase
    .from("exercises")
    .update(input)
    .eq("id", id)
    .eq("created_by", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Exercise");
  return data as Exercise;
}

/**
 * Soft-delete (archive) a custom exercise. Sets `archived_at`; the row is
 * preserved so historical workouts that reference it still resolve names.
 *
 * If the user really wants the row gone, they can delete it from Supabase
 * directly. Default app behaviour is "archive" because exercises usually
 * have downstream foreign keys we don't want to cascade.
 */
export async function archiveCustomExercise(
  supabase: SupabaseClient,
  userId: UUID,
  id: UUID,
): Promise<Exercise> {
  const existing = await getExercise(supabase, id);
  if (!existing.is_custom || existing.created_by !== userId) {
    throw new ValidationError("Only your own custom exercises can be archived.");
  }
  const { data, error } = await supabase
    .from("exercises")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Exercise");
  return data as Exercise;
}

/**
 * Restore a previously archived custom exercise.
 */
export async function restoreCustomExercise(
  supabase: SupabaseClient,
  userId: UUID,
  id: UUID,
): Promise<Exercise> {
  const existing = await getExercise(supabase, id);
  if (!existing.is_custom || existing.created_by !== userId) {
    throw new ValidationError("Only your own custom exercises can be restored.");
  }
  const { data, error } = await supabase
    .from("exercises")
    .update({ archived_at: null })
    .eq("id", id)
    .eq("created_by", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Exercise");
  return data as Exercise;
}
