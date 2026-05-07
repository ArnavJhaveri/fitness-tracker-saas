import { apiGet, apiPost, apiPut, apiDelete, buildQuery } from "./api";
import type { Meal, MealItem, FoodItem } from "@/types/database";

interface MealListParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
}
interface FoodSearchParams {
  q?: string;
  page?: number;
  per_page?: number;
  custom_only?: boolean;
}

export const nutritionService = {
  // ─── Meals ──────────────────────────────────────────────────────────────────
  listMeals: (p: MealListParams = {}) =>
    apiGet<Meal[]>(`/api/nutrition/meals${buildQuery({ page: 1, per_page: 20, ...p })}`),

  getMeal: (id: string) =>
    apiGet<Meal & { meal_items: (MealItem & { food_items?: FoodItem })[] }>(
      `/api/nutrition/meals/${id}`,
    ),

  createMeal: (data: {
    meal_type: string;
    name?: string | null;
    logged_at: string;
    notes?: string | null;
  }) => apiPost<Meal>("/api/nutrition/meals", data),

  updateMeal: (
    id: string,
    data: Partial<{
      meal_type: string;
      name: string | null;
      logged_at: string;
      notes: string | null;
    }>,
  ) => apiPut<Meal>(`/api/nutrition/meals/${id}`, data),

  deleteMeal: (id: string) => apiDelete(`/api/nutrition/meals/${id}`),

  // ─── Meal items ──────────────────────────────────────────────────────────────
  addMealItem: (mealId: string, data: { food_item_id: string; quantity_grams: number }) =>
    apiPost<MealItem>(`/api/nutrition/meals/${mealId}/items`, data),

  deleteMealItem: (mealId: string, itemId: string) =>
    apiDelete(`/api/nutrition/meals/${mealId}/items?item_id=${itemId}`),

  // ─── Food items ──────────────────────────────────────────────────────────────
  searchFood: (p: FoodSearchParams = {}) =>
    apiGet<FoodItem[]>(`/api/nutrition/food-items${buildQuery({ page: 1, per_page: 20, ...p })}`),

  /** Foods the caller logged in the last 14 days, deduped, capped at 12. */
  recentFoods: () => apiGet<FoodItem[]>(`/api/nutrition/food-items/recent`),

  createFoodItem: (data: {
    name: string;
    brand?: string | null;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g?: number | null;
  }) => apiPost<FoodItem>("/api/nutrition/food-items", data),
};
