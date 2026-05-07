"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { nutritionService } from "@/services/nutrition.service";
import { localDateStr } from "@/lib/utils/date";
import type { FoodItem } from "@/types/database";

const today = () => localDateStr();

export const MEALS_KEY = ["meals"] as const;
export const FOOD_KEY = ["food-items"] as const;
export const RECENT_FOODS_KEY = ["food-items", "recent"] as const;

/**
 * The user's most recently-logged foods. Powers the chip row in the food
 * logger so common foods are 1-tap. Capped server-side at 12 items.
 *
 * Cache duration: 5 minutes — recent-foods drift slowly relative to how
 * often the page is opened.
 */
export function useRecentFoods() {
  return useQuery<FoodItem[]>({
    queryKey: RECENT_FOODS_KEY,
    queryFn: () => nutritionService.recentFoods(),
    staleTime: 5 * 60_000,
  });
}

export function useMeals(date?: string) {
  const d = date ?? today();
  // Compute local midnight/end-of-day so meals logged in non-UTC timezones
  // appear under the correct local calendar date
  const start = new Date(d + "T00:00:00"); // local midnight
  const end = new Date(d + "T23:59:59"); // local end of day

  return useQuery({
    queryKey: [...MEALS_KEY, d],
    queryFn: () =>
      nutritionService.listMeals({
        from: start.toISOString(),
        to: end.toISOString(),
        per_page: 20,
      }),
    staleTime: 30_000,
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: nutritionService.createMeal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEALS_KEY });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nutritionService.deleteMeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEALS_KEY });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useAddMealItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealId,
      data,
    }: {
      mealId: string;
      data: { food_item_id: string; quantity_grams: number };
    }) => nutritionService.addMealItem(mealId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEALS_KEY });
      // Adding food items changes calorie totals — keep analytics in sync
      qc.invalidateQueries({ queryKey: ["analytics"] });
      // The food just logged should appear in the recent-foods chip row,
      // so invalidate that too.
      qc.invalidateQueries({ queryKey: RECENT_FOODS_KEY });
    },
  });
}

export function useDeleteMealItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mealId, itemId }: { mealId: string; itemId: string }) =>
      nutritionService.deleteMealItem(mealId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEALS_KEY });
      // Removing food items changes calorie totals — keep analytics in sync
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
