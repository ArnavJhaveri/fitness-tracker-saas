/**
 * Unit tests for src/lib/db/health.ts
 *
 * The health repo has three near-identical sleep/water/weight families. We
 * deliberately don't test every CRUD permutation — the interesting bugs all
 * live in the list/create paths:
 *
 *   - list: pagination range math, user_id scoping, optional from/to filters
 *           applied to the right column (sleep_start vs logged_at)
 *   - create: server-side user_id injection (clients must never set it)
 *   - update/delete: NotFoundError translation for missing rows
 *
 * If the order column ever drifts (e.g. someone changes sleep_entries to
 * order by logged_at), these tests catch it.
 */
import { describe, it, expect } from "vitest";
import {
  listSleepEntries,
  createSleepEntry,
  updateSleepEntry,
  listWaterEntries,
  createWaterEntry,
  listWeightEntries,
  createWeightEntry,
  updateWeightEntry,
} from "@/lib/db/health";
import { NotFoundError } from "@/lib/errors";
import { makeSupabaseMock } from "../../helpers/supabaseMock";

describe("db/health — listSleepEntries", () => {
  it("orders by sleep_start (not logged_at — sleep has no logged_at column)", async () => {
    // Sleep entries are unique among health tables: they're keyed on the
    // sleep_start timestamp, not a logged_at field. If this changes silently,
    // pagination becomes non-deterministic.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listSleepEntries(m.supabase, "user-1", { page: 1, per_page: 20 });

    expect(m.hasOp(0, "order", ["sleep_start", { ascending: false }])).toBe(true);
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
    expect(m.hasOp(0, "range", [0, 19])).toBe(true);
  });

  it("applies from/to filters against sleep_start when supplied", async () => {
    // The same column used for ordering is used for the date-range filter.
    // Filtering on logged_at instead would silently match nothing.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listSleepEntries(m.supabase, "user-1", {
      page: 1,
      per_page: 20,
      from: "2026-05-01T00:00:00Z",
      to: "2026-05-08T00:00:00Z",
    });

    expect(m.hasOp(0, "gte", ["sleep_start", "2026-05-01T00:00:00Z"])).toBe(true);
    expect(m.hasOp(0, "lte", ["sleep_start", "2026-05-08T00:00:00Z"])).toBe(true);
  });
});

describe("db/health — createSleepEntry", () => {
  it("injects user_id server-side, never trusting the client payload", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: { id: "s-1" }, error: null });

    await createSleepEntry(m.supabase, "user-1", {
      sleep_start: "2026-05-08T22:00:00Z",
      sleep_end: "2026-05-09T06:00:00Z",
      // @ts-expect-error — deliberately smuggling user_id
      user_id: "attacker",
    });

    const insertOp = m.calls[0].ops.find(([method]) => method === "insert");
    const payload = insertOp?.[1][0] as { user_id: string };
    expect(payload.user_id).toBe("user-1");
  });
});

describe("db/health — updateSleepEntry", () => {
  it("translates a missing row into NotFoundError", async () => {
    // Wrong owner / deleted row should not leak as a raw PostgREST error.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(
      updateSleepEntry(m.supabase, "user-1", "s-1", { quality: 4 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("db/health — listWaterEntries", () => {
  it("orders by logged_at and ranges correctly for non-first pages", async () => {
    // Range math: page=3, per_page=15 → range(30, 44).
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 100 });

    await listWaterEntries(m.supabase, "user-1", { page: 3, per_page: 15 });

    expect(m.hasOp(0, "order", ["logged_at", { ascending: false }])).toBe(true);
    expect(m.hasOp(0, "range", [30, 44])).toBe(true);
  });

  it("applies from filter against logged_at (matching the order column)", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listWaterEntries(m.supabase, "user-1", {
      page: 1,
      per_page: 20,
      from: "2026-05-01T00:00:00Z",
    });

    expect(m.hasOp(0, "gte", ["logged_at", "2026-05-01T00:00:00Z"])).toBe(true);
  });
});

describe("db/health — createWaterEntry", () => {
  it("injects user_id from the session", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: { id: "w-1" }, error: null });

    await createWaterEntry(m.supabase, "user-1", {
      amount_ml: 250,
      logged_at: "2026-05-08T12:00:00Z",
    });

    const insertOp = m.calls[0].ops.find(([method]) => method === "insert");
    const payload = insertOp?.[1][0] as { user_id: string; amount_ml: number };
    expect(payload.user_id).toBe("user-1");
    expect(payload.amount_ml).toBe(250);
  });
});

describe("db/health — listWeightEntries", () => {
  it("scopes to user_id and orders by logged_at desc", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listWeightEntries(m.supabase, "user-1", { page: 1, per_page: 20 });

    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
    expect(m.hasOp(0, "order", ["logged_at", { ascending: false }])).toBe(true);
  });
});

describe("db/health — createWeightEntry / updateWeightEntry", () => {
  it("create injects user_id from the session", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: { id: "wt-1" }, error: null });

    await createWeightEntry(m.supabase, "user-1", {
      weight_kg: 80,
      logged_at: "2026-05-08T08:00:00Z",
    });

    const insertOp = m.calls[0].ops.find(([method]) => method === "insert");
    const payload = insertOp?.[1][0] as { user_id: string };
    expect(payload.user_id).toBe("user-1");
  });

  it("update translates a missing row into NotFoundError", async () => {
    // Race condition: row was deleted between client read and update.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(
      updateWeightEntry(m.supabase, "user-1", "wt-1", { weight_kg: 79.5 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
