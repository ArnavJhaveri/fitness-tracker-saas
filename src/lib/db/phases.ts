/**
 * Phase repository — all database access for the phase domain.
 *
 * Routes stay thin HTTP adapters; SQL lives here. Functions are testable
 * in isolation and have no HTTP awareness.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { dayBefore, localDateStrInTz } from "@/lib/utils/date";
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
 *
 * If actualEndDate isn't supplied, default to "today in the user's local
 * timezone". Using `new Date().toISOString().slice(0,10)` directly would
 * compute UTC's date, which is wrong by 12+ hours for users in non-UTC
 * timezones. The DB's `phases_auto_set_end_date` trigger has the same
 * issue, but is only ever a fallback because callers always pass the
 * explicit value through this helper.
 */
export async function endPhase(
  supabase: SupabaseClient,
  userId: UUID,
  id: UUID,
  actualEndDate?: string,
): Promise<Phase> {
  // Prefer the caller-supplied date; otherwise compute today in the user's
  // local timezone (read from user_settings).
  let endDate = actualEndDate;
  if (!endDate) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
    const tz = (settings as { timezone?: string } | null)?.timezone ?? "UTC";
    endDate = localDateStrInTz(tz);
  }

  const { data, error } = await supabase
    .from("phases")
    .update({ status: "ended", actual_end_date: endDate })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Phase");
  return data as Phase;
}

/**
 * Pivot — end the current active phase and start a new one in a structured
 * sequence of writes.
 *
 * PostgREST doesn't expose transactions in the JS client, so we cannot make
 * the multi-row update atomic. Instead we lean on two invariants:
 *
 *   1. The unique partial index `(user_id) WHERE status='active'` — only
 *      ONE active phase per user, ever, enforced by the DB.
 *   2. Step ordering — the old phase's status moves OFF 'active' BEFORE
 *      the new phase is inserted as 'active'. If those happen in the
 *      opposite order, the unique index would reject the new insert.
 *
 * Writes:
 *   (1) mark old phase 'superseded' with actual_end_date = newStart − 1
 *   (2) insert new active phase with derived_from_phase_id pointing at old
 *   (3) patch old phase's superseded_by_phase_id pointer (cosmetic, non-fatal)
 *
 * If (1) succeeds but (2) fails, the user is left with NO active phase
 * AND the old phase incorrectly marked 'superseded'. We compensate by
 * rolling old back to 'ended' (a terminal state with no successor) — the
 * user lands in companion mode rather than a broken-lineage state, and
 * the error message reflects that accurately.
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
  // The new phase must start strictly AFTER the old phase started — otherwise
  // we'd compute actual_end_date < start_date and trip phases_actual_end_sane.
  if (newPhaseInput.start_date <= old.start_date) {
    throw new ValidationError("The new phase must start after the current phase started.");
  }

  // dayBefore() does pure UTC calendar arithmetic — DST-safe and matches
  // how Supabase stores DATE columns (no TZ). new Date(...) - 86_400_000ms
  // would silently miscompute on the spring-forward boundary.
  const oldEndDate = dayBefore(newPhaseInput.start_date);

  // 2. Mark old phase as superseded.
  const { data: oldUpdated, error: e1 } = await supabase
    .from("phases")
    .update({ status: "superseded", actual_end_date: oldEndDate })
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
    // Compensate: convert old phase from 'superseded' (broken lineage —
    // implies a successor that doesn't exist) to 'ended' (terminal, no
    // successor). The user lands in companion mode rather than a confusing
    // state with a phantom successor.
    const { error: revertErr } = await supabase
      .from("phases")
      .update({ status: "ended" })
      .eq("id", oldPhaseId)
      .eq("user_id", userId);
    if (revertErr) {
      console.error("[pivotPhase] compensating revert failed", revertErr);
    }
    throw new ValidationError(
      `New phase couldn't be created (${e2?.message ?? "unknown error"}). Your current phase has been ended without a successor — you can start a new phase from companion mode.`,
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
