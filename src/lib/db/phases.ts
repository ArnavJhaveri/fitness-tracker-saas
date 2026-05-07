/**
 * Phase repository — all database access for the phase domain.
 *
 * Routes stay thin HTTP adapters; SQL lives here. Functions are testable
 * in isolation and have no HTTP awareness.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Phase, UUID } from "@/types/database";
import type { CreatePhaseInput, UpdatePhaseCosmeticInput } from "@/lib/validations/phases";

// ─── List & get ───────────────────────────────────────────────────────────────

export async function listPhases(
  supabase: SupabaseClient,
  userId: UUID,
  params: { status?: Phase["status"]; limit?: number },
): Promise<Phase[]> {
  let query = supabase
    .from("phases")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.limit) query = query.limit(params.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Phase[];
}

export async function getActivePhase(
  supabase: SupabaseClient,
  userId: UUID,
): Promise<Phase | null> {
  const { data, error } = await supabase
    .from("phases")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return (data as Phase | null) ?? null;
}

export async function getPhase(supabase: SupabaseClient, userId: UUID, id: UUID): Promise<Phase> {
  const { data, error } = await supabase
    .from("phases")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new NotFoundError("Phase");
  return data as Phase;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a phase. If creating an `active` phase while one already exists,
 * the unique partial index will reject the insert — surface a 409-friendly
 * ValidationError so the route can translate it.
 */
export async function createPhase(
  supabase: SupabaseClient,
  userId: UUID,
  input: CreatePhaseInput,
): Promise<Phase> {
  const { data, error } = await supabase
    .from("phases")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique violation on phases_one_active_per_user
      throw new ValidationError(
        "You already have an active phase. End or pivot the current phase first.",
      );
    }
    throw error;
  }
  return data as Phase;
}

/**
 * In-place cosmetic edit. Only `name`, `notes`, `planned_end_date` may be
 * changed via this path — material changes flow through pivotPhase().
 */
export async function updatePhaseCosmetic(
  supabase: SupabaseClient,
  userId: UUID,
  id: UUID,
  input: UpdatePhaseCosmeticInput,
): Promise<Phase> {
  const { data, error } = await supabase
    .from("phases")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Phase");
  return data as Phase;
}

/**
 * End a phase without a replacement — drop into companion mode.
 */
export async function endPhase(
  supabase: SupabaseClient,
  userId: UUID,
  id: UUID,
  actualEndDate?: string,
): Promise<Phase> {
  const { data, error } = await supabase
    .from("phases")
    .update({
      status: "ended",
      actual_end_date: actualEndDate ?? new Date().toISOString().slice(0, 10),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Phase");
  return data as Phase;
}

/**
 * Pivot — supersede the current active phase and start a new one.
 *
 * Implemented as two sequential writes (PostgREST has no transaction
 * primitive in the JS client). The unique partial index on (user_id) WHERE
 * status='active' enforces correctness even if step 2 fails before step 1's
 * status flip propagates: the index will reject the second active phase.
 *
 * Order matters:
 *   1. Mark old phase superseded (frees the unique index slot)
 *   2. Insert new active phase
 *   3. Patch old phase's superseded_by_phase_id with new phase id
 *
 * If step 2 fails, step 1 leaves the user with no active phase — they can
 * retry the pivot or start fresh. Surface that explicitly.
 */
export async function pivotPhase(
  supabase: SupabaseClient,
  userId: UUID,
  oldPhaseId: UUID,
  newPhaseInput: CreatePhaseInput,
): Promise<{ oldPhase: Phase; newPhase: Phase }> {
  // 1. Verify ownership AND that this phase is currently active.
  const old = await getPhase(supabase, userId, oldPhaseId);
  if (old.status !== "active") {
    throw new ValidationError("Only the active phase can be pivoted.");
  }

  // 2. Mark old phase as superseded. actual_end_date is set by the trigger
  //    if we leave it null, but we set it explicitly to "the day before the
  //    new phase starts" so analytics on the cut-over day are unambiguous.
  const newStart = new Date(newPhaseInput.start_date);
  const dayBefore = new Date(newStart.getTime() - 86_400_000).toISOString().slice(0, 10);

  const { data: oldUpdated, error: e1 } = await supabase
    .from("phases")
    .update({
      status: "superseded",
      actual_end_date: dayBefore,
    })
    .eq("id", oldPhaseId)
    .eq("user_id", userId)
    .select()
    .single();
  if (e1 || !oldUpdated) throw e1 ?? new NotFoundError("Phase");

  // 3. Insert new phase with derived_from_phase_id lineage.
  const { data: created, error: e2 } = await supabase
    .from("phases")
    .insert({
      ...newPhaseInput,
      user_id: userId,
      status: "active",
      derived_from_phase_id: oldPhaseId,
    })
    .select()
    .single();

  if (e2 || !created) {
    // Best effort: don't try to roll back the supersede. The user is now
    // in companion mode; they can retry pivot or create a fresh phase.
    throw new ValidationError(
      `New phase couldn't be created (${e2?.message ?? "unknown error"}). The previous phase has been ended; you can start a new one.`,
    );
  }

  // 4. Patch old phase's superseded_by_phase_id pointer.
  const { error: e3 } = await supabase
    .from("phases")
    .update({ superseded_by_phase_id: (created as Phase).id })
    .eq("id", oldPhaseId)
    .eq("user_id", userId);
  if (e3) {
    // Non-fatal — the lineage pointer is purely for UI history rendering.
    // Log via console.error so it shows in Sentry but the user gets success.
    console.error("[pivotPhase] failed to set superseded_by_phase_id", e3);
  }

  return {
    oldPhase: oldUpdated as Phase,
    newPhase: created as Phase,
  };
}
