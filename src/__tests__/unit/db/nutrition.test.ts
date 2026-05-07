/**
 * Unit tests for src/lib/db/nutrition.ts
 *
 * Nutrition has the most interesting filtering logic of any repo:
 *
 *   - searchFoodItems must NEVER leak another user's custom items, but must
 *     surface public items + the caller's own customs. This is implemented
 *     via a single .or() clause that's easy to break.
 *   - createFoodItem must force is_custom=true and created_by=userId, even
 *     if the caller smuggled different values in the body.
 *   - addMealItem does an explicit ownership pre-flight on the parent meal
 *     so cross-user writes get a clean 404, not a Postgres policy violation.
 *   - deleteMealItem joins through meals!inner with meals.user_id scoping —
 *     if either filter is dropped, users could delete each other's items.
 *   - listMeals must ONLY select food_item columns that exist (a previous
 *     bug listed serving_size_g which doesn't exist and 500'd the endpoint).
 */
import { describe, it, expect } from "vitest";
import {
  searchFoodItems,
  createFoodItem,
  listMeals,
  createMeal,
  updateMeal,
  addMealItem,
  deleteMealItem,
} from "@/lib/db/nutrition";
import { NotFoundError } from "@/lib/errors";
import { makeSupabaseMock } from "../../helpers/supabaseMock";

describe("db/nutrition — searchFoodItems", () => {
  it("default search returns public items OR the caller's own customs (no leakage)", async () => {
    // The .or() clause is the only thing standing between user A and user B's
    // private food items. If this filter is removed, we silently leak.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await searchFoodItems(m.supabase, "user-1", "", { page: 1, per_page: 20 });

    const orOp = m.calls[0].ops.find(([method]) => method === "or");
    expect(orOp).toBeDefined();
    // The clause must contain both halves of the disjunction.
    const clause = orOp?.[1][0] as string;
    expect(clause).toContain("is_custom.eq.false");
    expect(clause).toContain("created_by.eq.user-1");
  });

  it("custom_only restricts to the caller's own custom items", async () => {
    // is_custom=true alone would leak ALL users' customs. The created_by
    // filter is what scopes it down.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await searchFoodItems(m.supabase, "user-1", "", {
      page: 1,
      per_page: 20,
      custom_only: true,
    });

    expect(m.hasOp(0, "eq", ["is_custom", true])).toBe(true);
    expect(m.hasOp(0, "eq", ["created_by", "user-1"])).toBe(true);
    // And the .or() escape-hatch is NOT used in this branch.
    expect(m.calls[0].ops.find(([method]) => method === "or")).toBeUndefined();
  });

  it("trims whitespace from the search query before ILIKE", async () => {
    // A bare ILIKE '%   %' matches every row — pinning the trim prevents that.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await searchFoodItems(m.supabase, "user-1", "  chicken  ", { page: 1, per_page: 20 });

    expect(m.hasOp(0, "ilike", ["name", "%chicken%"])).toBe(true);
  });

  it("skips ILIKE entirely when query is whitespace-only", async () => {
    // Empty/blank query should list everything matching the privacy filter,
    // not call ILIKE with an empty pattern.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await searchFoodItems(m.supabase, "user-1", "   ", { page: 1, per_page: 20 });

    expect(m.calls[0].ops.find(([method]) => method === "ilike")).toBeUndefined();
  });
});

describe("db/nutrition — createFoodItem", () => {
  it("forces is_custom=true and created_by=userId, ignoring client values", async () => {
    // Spread order: { ...input, is_custom: true, created_by: userId }. If
    // reversed, a client could create a "public" food item or impersonate
    // another creator.
    const m = makeSupabaseMock();
    m.queue({ data: { id: "f-1" }, error: null });

    await createFoodItem(m.supabase, "user-1", {
      name: "Greek yogurt",
      calories_per_100g: 60,
      protein_per_100g: 10,
      carbs_per_100g: 4,
      fat_per_100g: 0.4,
      // @ts-expect-error — deliberately smuggling protected fields
      is_custom: false,
      created_by: "attacker",
    });

    const insertOp = m.calls[0].ops.find(([method]) => method === "insert");
    const payload = insertOp?.[1][0] as { is_custom: boolean; created_by: string };
    expect(payload.is_custom).toBe(true);
    expect(payload.created_by).toBe("user-1");
  });
});

describe("db/nutrition — listMeals", () => {
  it("selects only food_item columns that actually exist on the table", async () => {
    // Regression guard: a previous version included serving_size_g which
    // doesn't exist in the schema, 500ing the entire meals list endpoint.
    // If anyone re-introduces a non-existent column here, this test catches it.
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listMeals(m.supabase, "user-1", { page: 1, per_page: 20 });

    const selectOp = m.calls[0].ops.find(([method]) => method === "select");
    const selectClause = selectOp?.[1][0] as string;
    expect(selectClause).not.toContain("serving_size_g");
    // Spot-check that the columns we DO need are present.
    expect(selectClause).toContain("calories_per_100g");
    expect(selectClause).toContain("protein_per_100g");
  });

  it("scopes to user_id and applies from/to filters against logged_at", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: [], error: null, count: 0 });

    await listMeals(m.supabase, "user-1", {
      page: 1,
      per_page: 20,
      from: "2026-05-01T00:00:00Z",
      to: "2026-05-08T00:00:00Z",
    });

    expect(m.hasOp(0, "eq", ["user_id", "user-1"])).toBe(true);
    expect(m.hasOp(0, "gte", ["logged_at", "2026-05-01T00:00:00Z"])).toBe(true);
    expect(m.hasOp(0, "lte", ["logged_at", "2026-05-08T00:00:00Z"])).toBe(true);
  });
});

describe("db/nutrition — createMeal / updateMeal", () => {
  it("createMeal injects user_id server-side", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: { id: "m-1" }, error: null });

    await createMeal(m.supabase, "user-1", {
      meal_type: "lunch",
      logged_at: "2026-05-08T13:00:00Z",
      name: null,
      notes: null,
    });

    const insertOp = m.calls[0].ops.find(([method]) => method === "insert");
    const payload = insertOp?.[1][0] as { user_id: string };
    expect(payload.user_id).toBe("user-1");
  });

  it("updateMeal translates a missing row into NotFoundError", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(updateMeal(m.supabase, "user-1", "m-1", { name: "Lunch" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("db/nutrition — addMealItem (ownership pre-flight)", () => {
  it("rejects when the parent meal doesn't belong to the user", async () => {
    // The pre-flight is what gives clients a clean 404 instead of an opaque
    // RLS-policy-violation error from the insert.
    const m = makeSupabaseMock();
    // getMeal returns no row → NotFoundError
    m.queue({ data: null, error: null });

    await expect(
      addMealItem(m.supabase, "user-1", "m-1", {
        food_item_id: "f-1",
        quantity_grams: 150,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    // Crucially, the insert must NOT have fired.
    expect(m.calls.length).toBe(1);
  });

  it("inserts with meal_id from the URL, never trusting client-supplied meal_id", async () => {
    const m = makeSupabaseMock();
    // Pre-flight: meal exists for user
    m.queue({ data: { id: "m-1", user_id: "user-1", meal_items: [] }, error: null });
    // Insert returns the new item
    m.queue({ data: { id: "mi-1", meal_id: "m-1" }, error: null });

    await addMealItem(m.supabase, "user-1", "m-1", {
      food_item_id: "f-1",
      quantity_grams: 150,
      // @ts-expect-error — client trying to override the meal scope
      meal_id: "different-meal",
    });

    const insertOp = m.calls[1].ops.find(([method]) => method === "insert");
    const payload = insertOp?.[1][0] as { meal_id: string };
    expect(payload.meal_id).toBe("m-1");
  });
});

describe("db/nutrition — deleteMealItem (cross-user delete guard)", () => {
  it("rejects when the item's parent meal isn't owned by the caller", async () => {
    // The meals!inner join with eq('meals.user_id', userId) is what scopes
    // the delete. If either side were dropped, users could delete each
    // other's items by guessing IDs.
    const m = makeSupabaseMock();
    m.queue({ data: null, error: null });

    await expect(deleteMealItem(m.supabase, "user-1", "mi-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    // No delete query should have fired.
    expect(m.calls.length).toBe(1);
    // The pre-flight must include both filters.
    expect(m.hasOp(0, "eq", ["id", "mi-1"])).toBe(true);
    expect(m.hasOp(0, "eq", ["meals.user_id", "user-1"])).toBe(true);
  });

  it("performs the delete only after ownership is confirmed", async () => {
    const m = makeSupabaseMock();
    m.queue({ data: { id: "mi-1", meals: { user_id: "user-1" } }, error: null });
    m.queue({ data: null, error: null });

    await deleteMealItem(m.supabase, "user-1", "mi-1");

    expect(m.calls.length).toBe(2);
    expect(m.calls[1].name).toBe("meal_items");
    expect(m.hasOp(1, "delete", [])).toBe(true);
    expect(m.hasOp(1, "eq", ["id", "mi-1"])).toBe(true);
  });
});
