import { describe, it, expect } from "vitest";
import {
  calcMealMacros,
  calcDayMacros,
  calcMacroPercents,
} from "@/features/nutrition/utils/macros";
import type { FoodItem, MealItem, Meal } from "@/types/database";

function foodItem(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: "food-1",
    name: "Test Food",
    brand: null,
    calories_per_100g: 100,
    protein_per_100g: 10,
    carbs_per_100g: 20,
    fat_per_100g: 5,
    fiber_per_100g: 2,
    sugar_per_100g: null,
    sodium_per_100g: null,
    is_custom: false,
    created_by: null,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function mealItem(
  food: FoodItem,
  quantity_grams: number,
  id = "item-1",
): MealItem & { food_items?: FoodItem } {
  return {
    id,
    meal_id: "meal-1",
    food_item_id: food.id,
    quantity_grams,
    created_at: "2025-01-01T12:00:00Z",
    food_items: food,
  };
}

// ─── calcMealMacros ───────────────────────────────────────────────────────────

describe("calcMealMacros", () => {
  it("returns zeros for empty meal", () => {
    const result = calcMealMacros([]);
    expect(result).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
    });
  });

  it("scales macros proportionally to grams", () => {
    // Food: 100kcal, 10g protein, 20g carbs, 5g fat per 100g
    // Portion: 200g → values should double
    const food = foodItem();
    const result = calcMealMacros([mealItem(food, 200)]);

    expect(result.calories).toBeCloseTo(200, 1);
    expect(result.protein_g).toBeCloseTo(20, 1);
    expect(result.carbs_g).toBeCloseTo(40, 1);
    expect(result.fat_g).toBeCloseTo(10, 1);
  });

  it("sums macros across multiple items", () => {
    const food1 = foodItem({ calories_per_100g: 200, protein_per_100g: 20 });
    const food2 = foodItem({ id: "food-2", calories_per_100g: 100, protein_per_100g: 5 });

    const result = calcMealMacros([
      mealItem(food1, 100, "item-1"), // 200 kcal, 20g protein
      mealItem(food2, 100, "item-2"), // 100 kcal, 5g protein
    ]);

    expect(result.calories).toBeCloseTo(300, 1);
    expect(result.protein_g).toBeCloseTo(25, 1);
  });

  it("skips items without food_items data (join not loaded)", () => {
    const item: MealItem = {
      id: "item-1",
      meal_id: "meal-1",
      food_item_id: "food-1",
      quantity_grams: 100,
      created_at: "2025-01-01T00:00:00Z",
    };
    const result = calcMealMacros([item]);
    expect(result.calories).toBe(0);
  });

  it("rounds to 1 decimal place", () => {
    // 33g of 100kcal food → 33kcal exactly (100/100*33)
    const food = foodItem({ calories_per_100g: 100 });
    const result = calcMealMacros([mealItem(food, 33)]);
    expect(result.calories).toBe(33);
  });
});

// ─── calcDayMacros ────────────────────────────────────────────────────────────

describe("calcDayMacros", () => {
  it("returns zeros for a day with no meals", () => {
    expect(calcDayMacros([])).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
    });
  });

  it("sums across multiple meals", () => {
    const food = foodItem({ calories_per_100g: 100 });
    const meals: (Meal & { meal_items?: (MealItem & { food_items?: FoodItem })[] })[] = [
      {
        id: "meal-1",
        user_id: "user-1",
        meal_type: "breakfast",
        name: "Breakfast",
        logged_at: "2025-08-01T08:00:00Z",
        notes: null,
        created_at: "2025-08-01T08:00:00Z",
        meal_items: [mealItem(food, 100)],
      },
      {
        id: "meal-2",
        user_id: "user-1",
        meal_type: "lunch",
        name: "Lunch",
        logged_at: "2025-08-01T12:00:00Z",
        notes: null,
        created_at: "2025-08-01T12:00:00Z",
        meal_items: [mealItem(food, 200, "item-2")],
      },
    ];

    const result = calcDayMacros(meals);
    expect(result.calories).toBeCloseTo(300, 1);
  });
});

// ─── calcMacroPercents ────────────────────────────────────────────────────────

describe("calcMacroPercents", () => {
  it("returns zeros when no calories", () => {
    const result = calcMacroPercents({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
    });
    expect(result).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });

  it("calculates correct percentages (protein=4kcal/g, carbs=4kcal/g, fat=9kcal/g)", () => {
    // 25g protein (100 kcal), 25g carbs (100 kcal), 0g fat
    // Total = 200 kcal → protein 50%, carbs 50%
    const result = calcMacroPercents({
      calories: 200,
      protein_g: 25,
      carbs_g: 25,
      fat_g: 0,
      fiber_g: 0,
    });
    expect(result.protein).toBe(50);
    expect(result.carbs).toBe(50);
    expect(result.fat).toBe(0);
  });

  it("percentages sum to approximately 100", () => {
    const result = calcMacroPercents({
      calories: 2000,
      protein_g: 150,
      carbs_g: 200,
      fat_g: 60,
      fiber_g: 0,
    });
    expect(result.protein + result.carbs + result.fat).toBeGreaterThanOrEqual(98);
    expect(result.protein + result.carbs + result.fat).toBeLessThanOrEqual(102);
  });
});
