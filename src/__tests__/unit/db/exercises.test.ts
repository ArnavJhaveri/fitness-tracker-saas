/**
 * Unit tests for src/lib/db/exercises.ts
 *
 * RLS at the DB level is the primary ownership guard, but the application
 * layer adds a second check on update/archive/restore so callers see a
 * clean ValidationError instead of a confusing "0 rows updated" silent
 * fail. These tests pin that pre-flight behaviour:
 *
 *   - System exercises (is_custom=false) are never editable
 *   - Custom exercises owned by another user are never editable
 *
 * If RLS were ever loosened (e.g. an admin role added) without a matching
 * app-side relaxation, these tests would catch the divergence.
 */
import { describe, it, expect } from "vitest";
import {
  searchExercises,
  updateCustomExercise,
  archiveCustomExercise,
  restoreCustomExercise,
} from "@/lib/db/exercises";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { makeSupabaseMock } from "../../helpers/supabaseMock";
import type { UpdateExerciseInput } from "@/lib/validations/workout";

const validUpdate: UpdateExerciseInput = { name: "Renamed lift" };

describe("db/exercises — searchExercises", () => {
  it("excludes archived rows by default", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await searchExercises(m.supabase, {
      page: 1,
      per_page: 20,
      userId: "user-1",
    });

    // The .is('archived_at', null) filter is what hides archived rows from
    // the picker. Removing it would silently surface archived exercises.
    expect(m.hasOp(0, "is", ["archived_at", null])).toBe(true);
  });

  it("keeps archived rows when includeArchived=true", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await searchExercises(m.supabase, {
      page: 1,
      per_page: 20,
      userId: "user-1",
      includeArchived: true,
    });

    expect(m.hasOp(0, "is", ["archived_at", null])).toBe(false);
  });

  it("orders custom-first then alphabetical", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await searchExercises(m.supabase, { page: 1, per_page: 20, userId: "user-1" });

    expect(m.hasOp(0, "order", ["is_custom", { ascending: false }])).toBe(true);
    expect(m.hasOp(0, "order", ["name", { ascending: true }])).toBe(true);
  });
});

describe("db/exercises — updateCustomExercise (ownership guards)", () => {
  it("rejects editing a system exercise", async () => {
    // System rows have is_custom=false, created_by=null.
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ex-sys", is_custom: false, created_by: null, name: "Bench press" },
      error: null,
    });

    await expect(
      updateCustomExercise(m.supabase, "user-1", "ex-sys", validUpdate),
    ).rejects.toBeInstanceOf(ValidationError);
    // The update query must NEVER fire when validation fails — only the
    // pre-flight read should have happened.
    expect(m.calls.length).toBe(1);
  });

  it("rejects editing another user's custom exercise", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ex-1", is_custom: true, created_by: "user-2", name: "x" },
      error: null,
    });

    await expect(
      updateCustomExercise(m.supabase, "user-1", "ex-1", validUpdate),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(m.calls.length).toBe(1);
  });

  it("allows editing your own custom exercise", async () => {
    const m = makeSupabaseMock();
    // Pre-flight: own custom exercise
    m.queue({
      data: { id: "ex-1", is_custom: true, created_by: "user-1", name: "Old" },
      error: null,
    });
    // Update returns the new row
    m.queue({
      data: { id: "ex-1", is_custom: true, created_by: "user-1", name: "Renamed lift" },
      error: null,
    });

    const result = await updateCustomExercise(m.supabase, "user-1", "ex-1", validUpdate);

    expect(result.name).toBe("Renamed lift");
    // Both read AND update happened
    expect(m.calls.length).toBe(2);
    // The update is double-scoped to created_by as belt-and-braces against
    // RLS misconfig.
    expect(m.hasOp(1, "eq", ["created_by", "user-1"])).toBe(true);
    expect(m.hasOp(1, "eq", ["id", "ex-1"])).toBe(true);
  });

  it("translates a missing row from the update step into NotFoundError", async () => {
    // Race condition: row passed pre-flight but vanished by the update.
    // Prevents callers from seeing an opaque PostgREST error.
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ex-1", is_custom: true, created_by: "user-1", name: "x" },
      error: null,
    });
    m.queue({ data: null, error: null });

    await expect(
      updateCustomExercise(m.supabase, "user-1", "ex-1", validUpdate),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("db/exercises — archiveCustomExercise (ownership guards)", () => {
  it("rejects archiving a system exercise", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ex-sys", is_custom: false, created_by: null, name: "Squat" },
      error: null,
    });

    await expect(archiveCustomExercise(m.supabase, "user-1", "ex-sys")).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(m.calls.length).toBe(1);
  });

  it("rejects archiving another user's custom exercise", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ex-1", is_custom: true, created_by: "user-2", name: "x" },
      error: null,
    });

    await expect(archiveCustomExercise(m.supabase, "user-1", "ex-1")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("sets archived_at on a successful own-row archive", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ex-1", is_custom: true, created_by: "user-1", name: "x" },
      error: null,
    });
    m.queue({
      data: { id: "ex-1", is_custom: true, archived_at: "2026-05-06T00:00:00.000Z" },
      error: null,
    });

    await archiveCustomExercise(m.supabase, "user-1", "ex-1");

    // Find the update op on the second call and assert archived_at is set.
    const updateOp = m.calls[1].ops.find(([method]) => method === "update");
    expect(updateOp).toBeDefined();
    const payload = updateOp?.[1][0] as { archived_at?: string };
    expect(typeof payload.archived_at).toBe("string");
  });
});

describe("db/exercises — restoreCustomExercise (ownership guards)", () => {
  it("rejects restoring a system exercise", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ex-sys", is_custom: false, created_by: null, name: "x" },
      error: null,
    });

    await expect(restoreCustomExercise(m.supabase, "user-1", "ex-sys")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects restoring another user's custom exercise", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: { id: "ex-1", is_custom: true, created_by: "user-2", name: "x" },
      error: null,
    });

    await expect(restoreCustomExercise(m.supabase, "user-1", "ex-1")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("clears archived_at on a successful own-row restore", async () => {
    const m = makeSupabaseMock();
    m.queue({
      data: {
        id: "ex-1",
        is_custom: true,
        created_by: "user-1",
        archived_at: "2026-04-01T00:00:00Z",
      },
      error: null,
    });
    m.queue({
      data: { id: "ex-1", is_custom: true, archived_at: null },
      error: null,
    });

    await restoreCustomExercise(m.supabase, "user-1", "ex-1");

    const updateOp = m.calls[1].ops.find(([method]) => method === "update");
    expect(updateOp?.[1][0]).toEqual({ archived_at: null });
  });
});
