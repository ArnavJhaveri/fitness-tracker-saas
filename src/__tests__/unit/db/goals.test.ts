/**
 * Unit tests for src/lib/db/goals.ts
 *
 * Most goal mutations are simple .eq(id).eq(user_id) writes — covered by RLS
 * and not worth pinning. The interesting bits are:
 *
 *   - listGoals: optional status filter must only apply when supplied
 *   - createGoal: user_id must be injected server-side (clients never send it)
 *   - update / get: missing rows translate to NotFoundError, not raw PostgREST
 *   - listGoals: pagination range math
 */
import { describe, it, expect } from "vitest";
import { listGoals, getGoal, createGoal, updateGoal } from "@/lib/db/goals";
import { NotFoundError } from "@/lib/errors";
import { makeSupabaseMock } from "../../helpers/supabaseMock";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validations/health";

const validCreate: CreateGoalInput = {
  type: "weight_loss",
  title: "Lose 5kg",
  target_value: 70,
  unit: "kg",
  target_date: "2026-09-01",
  description: null,
  current_value: null,
  phase_id: null,
};

describe("db/goals — listGoals", () => {
  it("scopes to user_id and orders newest-first with correct page range", async () => {
    // Pagination math: page=2, per_page=10 → range(10, 19). Off-by-one here
    // would either drop a row or duplicate one across pages.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 42 });

    const result = await listGoals(m.supabase, "user-1", { page: 2, per_page: 10 });

    expect(result.count).toBe(42);
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
    expect(m.hasOp(0, "order", ["created_at", { ascending: false }])).toBe(true);
    expect(m.hasOp(0, "range", [10, 19])).toBe(true);
  });

  it("only adds status filter when the param is supplied", async () => {
    // Without this conditional, an undefined status would be coerced to a
    // string filter and return zero rows.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listGoals(m.supabase, "user-1", { page: 1, per_page: 20 });

    expect(
      m.calls[0].ops.find(([op, args]) => op === "eq" && (args as unknown[])[0] === "status"),
    ).toBeUndefined();
  });

  it("applies status filter when provided", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listGoals(m.supabase, "user-1", { page: 1, per_page: 20, status: "active" });

    expect(m.hasOp(0, "eq", ["status", "active"])).toBe(true);
  });
});

describe("db/goals — getGoal", () => {
  it("translates a missing row into NotFoundError", async () => {
    // The RLS-scoped .single() returns null/error when the row isn't visible.
    // We always surface that as a clean 404 rather than the raw PostgREST shape.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(getGoal(m.supabase, "user-1", "g-1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("scopes by both id AND user_id (defence-in-depth on top of RLS)", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: { id: "g-1" }, error: null });

    await getGoal(m.supabase, "user-1", "g-1");

    expect(m.hasOp(0, "eq", ["id", "g-1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
  });
});

describe("db/goals — createGoal", () => {
  it("injects user_id from the session — clients can never set it", async () => {
    // Even if a client smuggled user_id into the payload, the spread order
    // here (`...input, user_id: userId`) overrides it. This test pins that.
    const m = makeSupabaseMock();
    m.queue({ data: { id: "g-1" }, error: null });

    await createGoal(m.supabase, "user-1", {
      ...validCreate,
      // @ts-expect-error — deliberately injecting a forbidden field
      user_id: "attacker-id",
    });

    const insertOp = m.calls[0].ops.find(([method]) => method === "insert");
    const payload = insertOp?.[1][0] as { user_id: string; type: string };
    expect(payload.user_id).toBe("user-1");
    expect(payload.type).toBe("weight_loss");
  });
});

describe("db/goals — updateGoal", () => {
  it("translates a missing row into NotFoundError", async () => {
    // Race condition / wrong-owner case. Returning raw error here would leak
    // PostgREST internals to the client.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    const update: UpdateGoalInput = { title: "Renamed" };
    await expect(updateGoal(m.supabase, "user-1", "g-1", update)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("scopes the update to id AND user_id", async () => {
    // Without the user_id filter, RLS is the only line of defence. Keep both.
    const m = makeSupabaseMock();
    m.queue({ data: { id: "g-1" }, error: null });

    await updateGoal(m.supabase, "user-1", "g-1", { status: "completed" });

    expect(m.hasOp(0, "eq", ["id", "g-1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
    expect(m.hasOp(0, "update", [{ status: "completed" }])).toBe(true);
  });
});
