/**
 * Phase repository — all database access for the phase domain.
 *
 * Routes stay thin HTTP adapters; SQL lives here. Functions are testable
 * in isolation and have no HTTP awareness.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { localDateStrInTz } from "@/lib/utils/date";
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

  // Only `active` phases can be ended via this path. Without this guard,
  // ending a `planned` phase (or one that's already 'ended'/'superseded')
  // silently moves it to 'ended' with today's date — corrupts history and
  // creates a "phase that ended without ever starting" record.
  const { data, error } = await supabase
    .from("phases")
    .update({ status: "ended", actual_end_date: endDate })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "active")
    .select()
    .single();
  if (error || !data) {
    // Ambiguous — could be wrong owner OR not active. Surface a clear message.
    throw new NotFoundError("Active phase");
  }
  return data as Phase;
}

/**
 * Pivot — end the current active phase and start a new one atomically.
 *
 * Implementation: calls the `pivot_phase` Postgres RPC (migration 004).
 * That function wraps lock + status flip + insert + lineage pointer in a
 * single transaction, which fixes two problems with the previous chained-
 * PostgREST approach:
 *
 *   (a) Two-tab concurrent pivots could interleave the status flip + insert,
 *       leaving inconsistent state.
 *   (b) A step-2 failure (e.g. CHECK violation on the new phase) used to
 *       leave the old phase incorrectly marked 'superseded' with no
 *       successor, requiring a compensating revert in app code.
 *
 * Application-side validation here is mostly redundant with the RPC's own
 * checks — but keeping it gives clean ValidationError messages without a
 * round trip when the caller obviously got it wrong.
 */
export async function pivotPhase(
  supabase: SupabaseClient,
  userId: UUID,
  oldPhaseId: UUID,
  newPhaseInput: CreatePhaseInput,
): Promise<{ oldPhase: Phase; newPhase: Phase }> {
  // Pre-flight checks — mirrored by the RPC, but caught here cheaper.
  const old = await getPhase(supabase, userId, oldPhaseId);
  if (old.status !== "active") {
    throw new ValidationError("Only the active phase can be pivoted.");
  }
  if (newPhaseInput.start_date <= old.start_date) {
    throw new ValidationError("The new phase must start after the current phase started.");
  }
  const { data: tzRow } = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();
  const tz = (tzRow as { timezone?: string } | null)?.timezone ?? "UTC";
  if (newPhaseInput.start_date < localDateStrInTz(tz)) {
    throw new ValidationError(
      "The new phase's start date can't be in the past — phases never rewrite history.",
    );
  }

  // Atomic RPC call. The function returns { old_phase_id, new_phase_id };
  // we re-fetch the full rows so callers get the same shape they did
  // before the migration.
  const { data: rpcResult, error: rpcErr } = await supabase.rpc("pivot_phase", {
    p_old_phase_id: oldPhaseId,
    p_new_phase: {
      ...newPhaseInput,
      // Stringify nullable date fields so the JSONB shape uses "" → null
      // via the RPC's NULLIF idiom.
      planned_end_date: newPhaseInput.planned_end_date ?? "",
      daily_calorie_target: newPhaseInput.daily_calorie_target ?? "",
      daily_protein_target_g: newPhaseInput.daily_protein_target_g ?? "",
      daily_carbs_target_g: newPhaseInput.daily_carbs_target_g ?? "",
      daily_fat_target_g: newPhaseInput.daily_fat_target_g ?? "",
      daily_sugar_target_g: newPhaseInput.daily_sugar_target_g ?? "",
      daily_water_target_ml: newPhaseInput.daily_water_target_ml ?? "",
      weekly_workout_target: newPhaseInput.weekly_workout_target ?? "",
      weekly_workout_hours_target: newPhaseInput.weekly_workout_hours_target ?? "",
      target_weight_kg: newPhaseInput.target_weight_kg ?? "",
      target_weight_change_kg_per_week: newPhaseInput.target_weight_change_kg_per_week ?? "",
    },
  });

  if (rpcErr) {
    // The RPC raises typed errors — surface them as ValidationError so the
    // route handler turns them into 400s rather than 500s.
    throw new ValidationError(rpcErr.message);
  }

  const ids = (rpcResult as { old_phase_id: string; new_phase_id: string }[])?.[0];
  if (!ids) throw new NotFoundError("Pivot result");

  // Read both phases back — needed because the RPC only returns IDs.
  const [oldPhase, newPhase] = await Promise.all([
    getPhase(supabase, userId, ids.old_phase_id),
    getPhase(supabase, userId, ids.new_phase_id),
  ]);
  return { oldPhase, newPhase };
}
