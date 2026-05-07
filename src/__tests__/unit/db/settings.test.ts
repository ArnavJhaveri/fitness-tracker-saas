/**
 * Unit tests for src/lib/db/settings.ts
 *
 * getSettings() has two invariants worth pinning:
 *
 *   1. It must always return a row — even if the auto-create-on-signup
 *      trigger misfired or the row was manually deleted, the read-then-
 *      upsert fallback recovers the user.
 *   2. The fallback is gated on "no row found", NOT on "any error". An
 *      earlier version used `.single()` plus a blanket `if (error || !data)
 *      upsert(...)`, which silently masked auth bugs (RLS denials, network
 *      failures) by inserting a phantom row. The current implementation
 *      uses `.maybeSingle()` so `error` only fires for real failures and
 *      `data: null` is the legitimate empty state.
 *
 * upsertSettings() is also where we ensure user_id is always injected
 * from the session, never trusted from the client body.
 */
import { describe, it, expect } from "vitest";
import { getSettings, upsertSettings } from "@/lib/db/settings";
import { makeSupabaseMock } from "../../helpers/supabaseMock";

describe("db/settings — getSettings", () => {
  it("returns the existing row on the happy path (no upsert fallback)", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: { user_id: "user-1", timezone: "UTC" }, error: null });

    const result = await getSettings(m.supabase, "user-1");

    expect(result).toMatchObject({ user_id: "user-1", timezone: "UTC" });
    // Only one query — no fallback needed.
    expect(m.calls.length).toBe(1);
    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
  });

  it("falls back to upsert when the read returns no row", async () => {
    // Defensive path for users whose auto-create trigger didn't run.
    // Without this fallback, settings pages would 500 forever for those users.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });
    m.queue({ data: { user_id: "user-1" }, error: null });

    const result = await getSettings(m.supabase, "user-1");

    expect(result).toMatchObject({ user_id: "user-1" });
    expect(m.calls.length).toBe(2);
    // Second call must be an upsert that injects user_id.
    const upsertOp = m.calls[1].ops.find(([method]) => method === "upsert");
    expect(upsertOp?.[1][0]).toEqual({ user_id: "user-1" });
  });

  it("throws on a real read error rather than silently upserting (RLS-mask regression guard)", async () => {
    // The previous implementation used `.single()` and treated
    // `error || !data` as "no row, so upsert". That meant a row-level
    // security denial — a real bug — surfaced as a successful settings
    // create, hiding the auth problem. With `.maybeSingle()` errors only
    // fire for genuine failures, and we re-throw them.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: { message: "row-level security violation" } });

    await expect(getSettings(m.supabase, "user-1")).rejects.toMatchObject({
      message: "row-level security violation",
    });
    // Crucially: only the read happened. No upsert masked the error.
    expect(m.calls.length).toBe(1);
  });

  it("throws when the upsert fallback also fails", async () => {
    // Read returned legitimate empty (data: null, error: null) → upsert
    // fired → upsert itself failed. Bubble up rather than silently return
    // a phantom object.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });
    m.queue({ data: null, error: { message: "duplicate key" } });

    await expect(getSettings(m.supabase, "user-1")).rejects.toMatchObject({
      message: "duplicate key",
    });
  });
});

describe("db/settings — upsertSettings", () => {
  it("injects user_id server-side, ignoring any in the payload", async () => {
    // Order of spread matters: { ...input, user_id: userId }. If reversed,
    // a malicious client could rewrite another user's row.
    const m = makeSupabaseMock();
    m.queue({ data: { user_id: "user-1", theme: "dark" }, error: null });

    await upsertSettings(m.supabase, "user-1", {
      theme: "dark",
      // @ts-expect-error — deliberately smuggling user_id
      user_id: "attacker",
    });

    const upsertOp = m.calls[0].ops.find(([method]) => method === "upsert");
    const payload = upsertOp?.[1][0] as { user_id: string; theme: string };
    expect(payload.user_id).toBe("user-1");
    expect(payload.theme).toBe("dark");
  });

  it("throws when the upsert returns no row", async () => {
    // The insert/update should always echo a row back. No row = something
    // is wrong (RLS, invalid payload). Throw rather than return a fake row.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(upsertSettings(m.supabase, "user-1", { theme: "light" })).rejects.toBeInstanceOf(
      Error,
    );
  });
});
