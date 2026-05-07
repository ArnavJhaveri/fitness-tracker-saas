/**
 * Unit tests for src/lib/db/analytics.ts
 *
 * Analytics is a thin wrapper over the `get_daily_summary` Postgres RPC.
 * The bug surface here is the RPC payload shape — specifically:
 *
 *   - p_user_id must always be sent (RLS depends on it)
 *   - p_from / p_to should ONLY appear in the args object when the caller
 *     supplied them. Sending `p_from: undefined` would shadow the SQL
 *     function's DEFAULT and break the "last 30 days" fallback.
 *   - getTodaySummary threads the caller-supplied localDate verbatim (the
 *     prior optional-arg + UTC fallback was wrong by ±12h for users far
 *     from UTC; localDate is now required — TS catches missing callers).
 */
import { describe, it, expect } from "vitest";
import { getDailySummary, getTodaySummary } from "@/lib/db/analytics";
import { makeSupabaseMock } from "../../helpers/supabaseMock";

describe("db/analytics — getDailySummary", () => {
  it("sends only p_user_id when no date range is supplied", async () => {
    // The RPC has SQL-level DEFAULTs for p_from/p_to. Including them as
    // `undefined` keys would override those defaults with NULL. This pins the
    // conditional-spread idiom in the source.
    const m = makeSupabaseMock();
    m.queueRpc({ data: [], error: null });

    await getDailySummary(m.supabase, "user-1");

    const rpcCall = m.calls.find((c) => c.kind === "rpc");
    expect(rpcCall?.name).toBe("get_daily_summary");
    expect(rpcCall?.rpcArgs).toEqual({ p_user_id: "user-1" });
  });

  it("includes p_from and p_to verbatim when supplied", async () => {
    const m = makeSupabaseMock();
    m.queueRpc({ data: [], error: null });

    await getDailySummary(m.supabase, "user-1", "2026-01-01", "2026-01-31");

    const rpcCall = m.calls.find((c) => c.kind === "rpc");
    expect(rpcCall?.rpcArgs).toEqual({
      p_user_id: "user-1",
      p_from: "2026-01-01",
      p_to: "2026-01-31",
    });
  });

  it("returns [] when the RPC returns null data", async () => {
    // Some PostgREST permutations return data:null for an empty result.
    // The wrapper coalesces this to [] so callers can iterate unconditionally.
    const m = makeSupabaseMock();
    m.queueRpc({ data: null, error: null });

    const result = await getDailySummary(m.supabase, "user-1");
    expect(result).toEqual([]);
  });

  it("propagates RPC errors unchanged", async () => {
    // The repo deliberately doesn't translate analytics errors — they're
    // either RLS denials or function bugs, both of which want to bubble.
    const m = makeSupabaseMock();
    m.queueRpc({ data: null, error: { message: "boom" } });

    await expect(getDailySummary(m.supabase, "user-1")).rejects.toMatchObject({ message: "boom" });
  });
});

describe("db/analytics — getTodaySummary", () => {
  it("threads the caller-supplied localDate as both from and to (no UTC drift)", async () => {
    // The earlier signature accepted localDate as optional and fell back to
    // `new Date().toISOString()`, which silently used server-side UTC and
    // was wrong by ±12h for users far from UTC. Now localDate is required —
    // typescript catches missing-arg callers and this test pins the
    // verbatim-passthrough behaviour for callers that do supply it.
    const m = makeSupabaseMock();
    m.queueRpc({ data: [{ date: "2026-05-09" }], error: null });

    await getTodaySummary(m.supabase, "user-1", "2026-05-09");

    const rpcCall = m.calls.find((c) => c.kind === "rpc");
    expect(rpcCall?.rpcArgs).toEqual({
      p_user_id: "user-1",
      p_from: "2026-05-09",
      p_to: "2026-05-09",
    });
  });

  it("returns null when the RPC returns no rows", async () => {
    // The RPC always returns 0 or 1 row for from=to=today, so the wrapper
    // collapses [] → null to give callers a clean nullable shape.
    const m = makeSupabaseMock();
    m.queueRpc({ data: [], error: null });

    const result = await getTodaySummary(m.supabase, "user-1", "2026-05-08");
    expect(result).toBeNull();
  });

  it("returns the single row when present", async () => {
    const m = makeSupabaseMock();
    m.queueRpc({ data: [{ date: "2026-05-08", calories: 2100 }], error: null });

    const result = await getTodaySummary(m.supabase, "user-1", "2026-05-08");
    expect(result).toMatchObject({ date: "2026-05-08", calories: 2100 });
  });
});
