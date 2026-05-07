/**
 * Unit tests for src/lib/db/phases.ts
 *
 * The repository layer is where the SQL lives, so it's where our subtle
 * correctness bugs hide. Each test pins one of those: timezone fallback,
 * status-guard on endPhase, and the JSONB payload shape pivotPhase sends
 * to its Postgres RPC.
 *
 * We don't talk to a real database — `makeSupabaseMock` records the chain
 * and lets us assert on the recorded ops. That's enough fidelity to catch
 * "the .eq('status', 'active') filter went missing" or "we forgot to map
 * `null` → '' for the RPC's NULLIF idiom".
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { endPhase, pivotPhase, getActivePhase, listPhases } from "@/lib/db/phases";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { makeSupabaseMock } from "../../helpers/supabaseMock";
import type { CreatePhaseInput } from "@/lib/validations/phases";

// Common, valid CreatePhaseInput stub. Tests override fields they care about.
const newPhaseInput: CreatePhaseInput = {
  name: "Cut block 2",
  phase_type: "cut",
  start_date: "2026-06-01",
  status: "active",
  notes: null,
  planned_end_date: null,
  daily_calorie_target: 2000,
  daily_protein_target_g: 180,
  daily_carbs_target_g: null,
  daily_fat_target_g: null,
  daily_sugar_target_g: null,
  daily_water_target_ml: null,
  weekly_workout_target: null,
  weekly_workout_hours_target: null,
  target_weight_kg: 75,
  target_weight_change_kg_per_week: -0.5,
};

describe("db/phases — listPhases", () => {
  it("filters by user_id and orders by start_date desc", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [{ id: "p1" }], error: null });

    const result = await listPhases(m.supabase, "user-1", {});

    expect(result).toEqual([{ id: "p1" }]);
    // Recorded ops should include the user_id filter and the order clause.
    expect(m.calls[0].name).toBe("phases");
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
    expect(m.hasOp(0, "order", ["start_date", { ascending: false }])).toBe(true);
  });

  it("applies status + limit when provided", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null });

    await listPhases(m.supabase, "user-1", { status: "active", limit: 5 });

    expect(m.hasOp(0, "eq", ["status", "active"])).toBe(true);
    expect(m.hasOp(0, "limit", [5])).toBe(true);
  });
});

describe("db/phases — getActivePhase", () => {
  it("returns null when no active phase exists", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    const result = await getActivePhase(m.supabase, "user-1");

    expect(result).toBeNull();
    expect(m.hasOp(0, "eq", ["status", "active"])).toBe(true);
  });
});

describe("db/phases — endPhase", () => {
  it("uses the caller-supplied date and requires status='active' filter", async () => {
    // Without the .eq('status','active') guard, this function would silently
    // overwrite a 'planned' or already-'ended' phase. The test pins it.
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "p1", status: "ended", actual_end_date: "2026-05-01" },
      error: null,
    });

    const result = await endPhase(m.supabase, "user-1", "p1", "2026-05-01");

    expect(result.actual_end_date).toBe("2026-05-01");
    // Defence-in-depth filters all present:
    expect(m.calls[0].name).toBe("phases");
    expect(m.hasOp(0, "eq", ["id", "p1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["status", "active"])).toBe(true);
    expect(m.hasOp(0, "update", [{ status: "ended", actual_end_date: "2026-05-01" }])).toBe(true);
  });

  it("falls back to today-in-user-timezone when no date supplied", async () => {
    // Freeze 'now' so the assertion is deterministic. Pacific/Auckland is
    // UTC+12, so a UTC midday becomes the *next* calendar day there — which
    // is exactly the scenario this fallback exists for.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T12:00:00Z")); // UTC noon

    const m = makeSupabaseMock();
    // 1st query: user_settings TZ lookup
    m.queue({ data: { timezone: "Pacific/Auckland" }, error: null });
    // 2nd query: the phase update
    m.queue({
      data: { id: "p1", status: "ended", actual_end_date: "2026-05-07" },
      error: null,
    });

    await endPhase(m.supabase, "user-1", "p1");

    expect(m.calls[0].name).toBe("user_settings");
    expect(m.calls[1].name).toBe("phases");
    // The update payload should carry the Auckland date (2026-05-07), not UTC.
    const updateOp = m.calls[1].ops.find(([method]) => method === "update");
    expect(updateOp?.[1][0]).toMatchObject({
      status: "ended",
      actual_end_date: "2026-05-07",
    });
  });

  it("falls back to UTC when user_settings has no timezone row", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T12:00:00Z"));

    const m = makeSupabaseMock();
    m.queue({ data: null, error: null }); // no user_settings row
    m.queue({
      data: { id: "p1", status: "ended", actual_end_date: "2026-05-06" },
      error: null,
    });

    await endPhase(m.supabase, "user-1", "p1");

    const updateOp = m.calls[1].ops.find(([method]) => method === "update");
    expect(updateOp?.[1][0]).toMatchObject({ actual_end_date: "2026-05-06" });
  });

  it("throws NotFoundError when the phase isn't active (or wrong owner)", async () => {
    // The DB returns no row when the .eq('status','active') filter excludes
    // it. We treat that uniformly as NotFoundError so callers get a clean 404.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(endPhase(m.supabase, "user-1", "p1", "2026-05-01")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("db/phases — pivotPhase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects when old phase isn't active", async () => {
    const m = makeSupabaseMock();
    // getPhase pre-flight returns a non-active phase
    m.queue({
      data: { id: "p1", status: "ended", start_date: "2026-04-01" },
      error: null,
    });

    await expect(
      pivotPhase(m.supabase, "user-1", "p1", { ...newPhaseInput, start_date: "2026-06-01" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when new start_date <= old.start_date", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "p1", status: "active", start_date: "2026-06-15" },
      error: null,
    });

    await expect(
      pivotPhase(m.supabase, "user-1", "p1", { ...newPhaseInput, start_date: "2026-06-15" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when new start_date is in the past (in user's tz)", async () => {
    const m = makeSupabaseMock();
    // active phase with old start
    m.queue({
      data: { id: "p1", status: "active", start_date: "2026-04-01" },
      error: null,
    });
    // user tz lookup
    m.queue({ data: { timezone: "UTC" }, error: null });

    // Today (UTC) is 2026-05-06 — anything before that is "rewriting history".
    await expect(
      pivotPhase(m.supabase, "user-1", "p1", { ...newPhaseInput, start_date: "2026-04-15" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("calls pivot_phase RPC with the JSONB nullable-coerced payload", async () => {
    // The RPC's NULLIF idiom expects "" → NULL for nullable date/numeric
    // fields. If we ever forget to map a null → '', the RPC silently writes
    // a literal "null" string and the row breaks. This test pins the mapping.
    const m = makeSupabaseMock();
    // (1) getPhase for the old phase — must be active, start before new
    m.queue({
      data: { id: "p1", status: "active", start_date: "2026-04-01" },
      error: null,
    });
    // (2) user_settings TZ
    m.queue({ data: { timezone: "UTC" }, error: null });
    // (3) the RPC itself returns the id pair
    m.queueRpc({
      data: [{ old_phase_id: "p1", new_phase_id: "p2" }],
      error: null,
    });
    // (4) Promise.all re-fetch — order isn't guaranteed, but the queue is
    // FIFO and the function awaits via Promise.all([oldFetch, newFetch]),
    // which JS will execute in argument-order.
    m.queue({
      data: { id: "p1", status: "superseded", actual_end_date: "2026-05-31" },
      error: null,
    });
    m.queue({ data: { id: "p2", status: "active", start_date: "2026-06-01" }, error: null });

    const result = await pivotPhase(m.supabase, "user-1", "p1", newPhaseInput);

    expect(result.oldPhase.id).toBe("p1");
    expect(result.newPhase.id).toBe("p2");

    // Find the rpc call and assert its payload shape.
    const rpcCall = m.calls.find((c) => c.kind === "rpc");
    expect(rpcCall).toBeDefined();
    expect(rpcCall?.name).toBe("pivot_phase");
    const args = rpcCall?.rpcArgs as {
      p_old_phase_id: string;
      p_new_phase: Record<string, unknown>;
    };
    expect(args.p_old_phase_id).toBe("p1");

    // Real values pass through untouched.
    expect(args.p_new_phase.name).toBe("Cut block 2");
    expect(args.p_new_phase.start_date).toBe("2026-06-01");
    expect(args.p_new_phase.daily_calorie_target).toBe(2000);
    expect(args.p_new_phase.target_weight_kg).toBe(75);

    // null fields get coerced to "" so the RPC's NULLIF can resolve them
    // back to SQL NULL. Spot-check several across both date and numeric.
    expect(args.p_new_phase.planned_end_date).toBe("");
    expect(args.p_new_phase.daily_carbs_target_g).toBe("");
    expect(args.p_new_phase.daily_fat_target_g).toBe("");
    expect(args.p_new_phase.weekly_workout_target).toBe("");
  });

  it("translates RPC error into ValidationError", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "p1", status: "active", start_date: "2026-04-01" },
      error: null,
    });
    m.queue({ data: { timezone: "UTC" }, error: null });
    m.queueRpc({
      data: null,
      error: { message: "old phase not found or not active" },
    });

    await expect(pivotPhase(m.supabase, "user-1", "p1", newPhaseInput)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
