/**
 * Macro calculation helpers — all pure, unit-tested functions.
 * Business logic lives here, NOT in components.
 */
import type { FoodItem, Meal, MealItem } from "@/types/database";

export interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

/** Calculate macros for a given food item at a specific quantity. Internal helper. */
function calcItemMacros(food: FoodItem, grams: number): MacroTotals {
  const ratio = grams / 100;
  return {
    calories: Math.round(food.calories_per_100g * ratio * 10) / 10,
    protein_g: Math.round(food.protein_per_100g * ratio * 10) / 10,
    carbs_g: Math.round(food.carbs_per_100g * ratio * 10) / 10,
    fat_g: Math.round(food.fat_per_100g * ratio * 10) / 10,
    fiber_g: Math.round((food.fiber_per_100g ?? 0) * ratio * 10) / 10,
  };
}

/** Sum macros across all items in a meal. */
export function calcMealMacros(items: (MealItem & { food_items?: FoodItem })[]): MacroTotals {
  return items.reduce(
    (acc, item) => {
      if (!item.food_items) return acc;
      const m = calcItemMacros(item.food_items, item.quantity_grams);
      return {
        calories: acc.calories + m.calories,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
        fiber_g: acc.fiber_g + m.fiber_g,
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );
}

/** Sum macros across all meals for a day. */
export function calcDayMacros(
  meals: (Meal & { meal_items?: (MealItem & { food_items?: FoodItem })[] })[],
): MacroTotals {
  return meals.reduce(
    (acc, meal) => {
      const m = calcMealMacros(meal.meal_items ?? []);
      return {
        calories: acc.calories + m.calories,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
        fiber_g: acc.fiber_g + m.fiber_g,
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );
}

/**
 * Macro distribution as percentages of total calories.
 * Reserved for use in MacroSummary when a percentage breakdown UI is added.
 */
export function calcMacroPercents(totals: MacroTotals): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const total = totals.protein_g * 4 + totals.carbs_g * 4 + totals.fat_g * 9;
  if (!total) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round(((totals.protein_g * 4) / total) * 100),
    carbs: Math.round(((totals.carbs_g * 4) / total) * 100),
    fat: Math.round(((totals.fat_g * 9) / total) * 100),
  };
}
