import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/lib/errors";
import type { FoodItem, Meal, MealItem } from "@/types/database";
import type {
  CreateMealInput,
  AddMealItemInput,
  CreateFoodItemInput,
} from "@/lib/validations/nutrition";

// ─── Food items ───────────────────────────────────────────────────────────────

export async function searchFoodItems(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  params: { page: number; per_page: number; custom_only?: boolean },
): Promise<{ data: FoodItem[]; count: number }> {
  let q = supabase
    .from("food_items")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);

  if (params.custom_only) {
    // Only return the current user's custom items, not all custom items
    q = q.eq("is_custom", true).eq("created_by", userId);
  } else {
    // Always exclude other users' private items from the default search.
    // Return public items (is_custom = false) OR the caller's own custom items.
    q = q.or(`is_custom.eq.false,and(is_custom.eq.true,created_by.eq.${userId})`);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: (data ?? []) as FoodItem[], count: count ?? 0 };
}

export async function createFoodItem(
  supabase: SupabaseClient,
  userId: string,
  input: CreateFoodItemInput,
): Promise<FoodItem> {
  const { data, error } = await supabase
    .from("food_items")
    .insert({ ...input, is_custom: true, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as FoodItem;
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export async function listMeals(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; per_page: number; from?: string; to?: string },
): Promise<{ data: Meal[]; count: number }> {
  let query = supabase
    .from("meals")
    // Select only the food_item columns needed for macro calculations —
    // avoids fetching sugar_per_100g, sodium_per_100g, and other unused fields
    // across potentially hundreds of items in a paginated list.
    .select(
      `*, meal_items ( *, food_items ( id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size_g, is_custom, created_by ) )`,
      { count: "exact" },
    )
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

  if (params.from) query = query.gte("logged_at", params.from);
  if (params.to) query = query.lte("logged_at", params.to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as Meal[], count: count ?? 0 };
}

export async function getMeal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Meal & { meal_items: (MealItem & { food_items?: FoodItem })[] }> {
  const { data, error } = await supabase
    .from("meals")
    .select(`*, meal_items ( *, food_items ( * ) )`)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new NotFoundError("Meal");
  return data as Meal & { meal_items: (MealItem & { food_items?: FoodItem })[] };
}

export async function createMeal(
  supabase: SupabaseClient,
  userId: string,
  input: CreateMealInput,
): Promise<Meal> {
  const { data, error } = await supabase
    .from("meals")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Meal;
}

export async function updateMeal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: Partial<CreateMealInput>,
): Promise<Meal> {
  const { data, error } = await supabase
    .from("meals")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Meal");
  return data as Meal;
}

export async function deleteMeal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("meals").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// ─── Meal items (individual food entries inside a meal) ───────────────────────

/**
 * Add a food item to a meal.
 *
 * Ownership is verified in two layers:
 *   1. This function fetches the parent meal scoped to userId first —
 *      throws NotFoundError if the meal doesn't belong to the caller.
 *   2. Supabase RLS on meal_items enforces the same rule at the DB level.
 *
 * Both checks are kept so that a RLS misconfiguration can never silently
 * allow cross-user writes, and so callers get a meaningful 404 rather than
 * a Postgres policy violation.
 */
export async function addMealItem(
  supabase: SupabaseClient,
  userId: string,
  mealId: string,
  input: AddMealItemInput,
): Promise<MealItem> {
  // Ownership check — throws NotFoundError if meal doesn't belong to userId
  await getMeal(supabase, userId, mealId);

  const { data, error } = await supabase
    .from("meal_items")
    .insert({ ...input, meal_id: mealId })
    .select(`*, food_items ( * )`)
    .single();
  if (error) throw error;
  return data as MealItem;
}

/**
 * Remove a food item from a meal.
 *
 * Ownership is enforced by joining through the meals table scoped to userId —
 * the delete only affects rows where the parent meal belongs to the caller.
 * This is defence-in-depth on top of Supabase RLS.
 */
export async function deleteMealItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
): Promise<void> {
  // Delete the item only if its parent meal belongs to userId.
  // The subquery approach isn't directly supported by the Supabase JS client,
  // so we first verify ownership of the item via a join, then delete.
  const { data: item, error: fetchErr } = await supabase
    .from("meal_items")
    .select("id, meals!inner(user_id)")
    .eq("id", itemId)
    .eq("meals.user_id", userId)
    .single();

  if (fetchErr || !item) throw new NotFoundError("Meal item");

  const { error } = await supabase.from("meal_items").delete().eq("id", itemId);
  if (error) throw error;
}
