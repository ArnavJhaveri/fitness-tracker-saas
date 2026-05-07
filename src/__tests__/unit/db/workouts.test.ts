/**
 * Unit tests for src/lib/db/workouts.ts
 *
 * Workouts is the deepest nested domain (sessions → exercises → sets), and
 * the only place we have ID-pair scoping to prevent cross-resource access:
 *
 *   - removeExerciseFromSession must scope by BOTH exerciseId AND sessionId,
 *     so guessing an exerciseId doesn't let you delete from another session.
 *   - updateSet / deleteSet do the same with (setId, workoutExerciseId).
 *   - getWorkoutSession nests workout_exercises ordered by order_index, then
 *     sorts each exercise's exercise_sets by set_number client-side because
 *     supabase-js v2 doesn't support deeply-nested referencedTable ordering.
 *   - listWorkoutSessions: pagination range math + from/to filtering on
 *     started_at.
 *   - createWorkoutSession must inject user_id from the session.
 */
import { describe, it, expect } from "vitest";
import {
  listWorkoutSessions,
  getWorkoutSession,
  createWorkoutSession,
  updateWorkoutSession,
  removeExerciseFromSession,
  updateSet,
  deleteSet,
} from "@/lib/db/workouts";
import { NotFoundError } from "@/lib/errors";
import { makeSupabaseMock } from "../../helpers/supabaseMock";

describe("db/workouts — listWorkoutSessions", () => {
  it("scopes to user_id, orders by started_at desc, applies pagination", async () => {
    // Range math: page=1, per_page=10 → range(0, 9). Off-by-one would skip
    // the first row of every page.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 25 });

    const result = await listWorkoutSessions(m.supabase, "user-1", { page: 1, per_page: 10 });

    expect(result.count).toBe(25);
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
    expect(m.hasOp(0, "order", ["started_at", { ascending: false }])).toBe(true);
    expect(m.hasOp(0, "range", [0, 9])).toBe(true);
  });

  it("only adds from/to filters when supplied", async () => {
    // Without the conditional, undefined values would shadow PostgREST
    // defaults and return zero rows.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listWorkoutSessions(m.supabase, "user-1", { page: 1, per_page: 20 });

    expect(m.calls[0].ops.find(([op]) => op === "gte")).toBeUndefined();
    expect(m.calls[0].ops.find(([op]) => op === "lte")).toBeUndefined();
  });

  it("applies started_at filters when from/to are present", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listWorkoutSessions(m.supabase, "user-1", {
      page: 1,
      per_page: 20,
      from: "2026-05-01T00:00:00Z",
      to: "2026-05-08T00:00:00Z",
    });

    expect(m.hasOp(0, "gte", ["started_at", "2026-05-01T00:00:00Z"])).toBe(true);
    expect(m.hasOp(0, "lte", ["started_at", "2026-05-08T00:00:00Z"])).toBe(true);
  });
});

describe("db/workouts — getWorkoutSession", () => {
  it("orders nested workout_exercises by order_index ascending", async () => {
    // The order(referencedTable: 'workout_exercises') call is what guarantees
    // exercises render in the order the user added them. Without it,
    // PostgREST returns them in arbitrary nested-fetch order.
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ws-1", workout_exercises: [] },
      error: null,
    });

    await getWorkoutSession(m.supabase, "user-1", "ws-1");

    expect(
      m.hasOp(0, "order", [
        "order_index",
        { referencedTable: "workout_exercises", ascending: true },
      ]),
    ).toBe(true);
    expect(m.hasOp(0, "eq", ["id", "ws-1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
  });

  it("client-sorts exercise_sets by set_number (supabase-js v2 limitation)", async () => {
    // The comment in source explains: deeply-nested order isn't supported
    // by supabase-js v2, so we sort client-side. If anyone ever drops that
    // sort believing supabase will do it, sets render out of order.
    const m = makeSupabaseMock();
    m.queue({
      data: {
        id: "ws-1",
        workout_exercises: [
          {
            id: "we-1",
            order_index: 0,
            exercise_sets: [
              { id: "s-3", set_number: 3 },
              { id: "s-1", set_number: 1 },
              { id: "s-2", set_number: 2 },
            ],
          },
        ],
      },
      error: null,
    });

    const result = await getWorkoutSession(m.supabase, "user-1", "ws-1");

    expect(result.workout_exercises[0].exercise_sets.map((s) => s.set_number)).toEqual([1, 2, 3]);
  });

  it("translates a missing row into NotFoundError", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(getWorkoutSession(m.supabase, "user-1", "ws-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("db/workouts — createWorkoutSession / updateWorkoutSession", () => {
  it("create injects user_id server-side", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: { id: "ws-1" }, error: null });

    await createWorkoutSession(m.supabase, "user-1", {
      name: "Push day",
      started_at: "2026-05-08T08:00:00Z",
      notes: null,
      ended_at: null,
    });

    const insertOp = m.calls[0].ops.find(([method]) => method === "insert");
    const payload = insertOp?.[1][0] as { user_id: string; name: string };
    expect(payload.user_id).toBe("user-1");
    expect(payload.name).toBe("Push day");
  });

  it("update translates a missing row into NotFoundError", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(
      updateWorkoutSession(m.supabase, "user-1", "ws-1", { name: "Renamed" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("db/workouts — removeExerciseFromSession (ID-pair scope)", () => {
  it("scopes the delete to BOTH exerciseId and sessionId", async () => {
    // Without the workout_session_id filter, knowing an exerciseId would
    // let any user delete it regardless of which session it belongs to.
    // (RLS on workout_exercises would normally catch this, but app-side
    // belt-and-braces matters when RLS is misconfigured.)
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await removeExerciseFromSession(m.supabase, "we-1", "ws-1");

    expect(m.calls[0].name).toBe("workout_exercises");
    expect(m.hasOp(0, "eq", ["id", "we-1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["workout_session_id", "ws-1"])).toBe(true);
    expect(m.hasOp(0, "delete", [])).toBe(true);
  });
});

describe("db/workouts — updateSet (ID-pair scope)", () => {
  it("scopes the update to BOTH setId and workoutExerciseId", async () => {
    // Same defence-in-depth as removeExerciseFromSession.
    const m = makeSupabaseMock();
    m.queue({ data: { id: "s-1" }, error: null });

    await updateSet(m.supabase, "s-1", "we-1", { reps: 8 });

    expect(m.hasOp(0, "eq", ["id", "s-1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["workout_exercise_id", "we-1"])).toBe(true);
    expect(m.hasOp(0, "update", [{ reps: 8 }])).toBe(true);
  });

  it("translates a missing row into NotFoundError", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(updateSet(m.supabase, "s-1", "we-1", { reps: 8 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("db/workouts — deleteSet (ID-pair scope)", () => {
  it("scopes the delete to BOTH setId and workoutExerciseId", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await deleteSet(m.supabase, "s-1", "we-1");

    expect(m.hasOp(0, "eq", ["id", "s-1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["workout_exercise_id", "we-1"])).toBe(true);
  });
});
