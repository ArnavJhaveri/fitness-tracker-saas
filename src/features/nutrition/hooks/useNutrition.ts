"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { nutritionService } from "@/services/nutrition.service";

/** Local calendar date as "YYYY-MM-DD" — correct in all timezones. */
function localDateStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const today = () => localDateStr();

export const MEALS_KEY = ["meals"] as const;
export const FOOD_KEY = ["food-items"] as const;

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
