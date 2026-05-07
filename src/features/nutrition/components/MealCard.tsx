"use client";

import { Trash2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useState } from "react";
import type { Meal, MealItem, FoodItem } from "@/types/database";
import { useDeleteMeal, useAddMealItem, useDeleteMealItem } from "../hooks/useNutrition";
import { calcMealMacros } from "../utils/macros";
import { FoodSearch } from "./FoodSearch";

type FullMealItem = MealItem & { food_items?: FoodItem };
type FullMeal = Meal & { meal_items?: FullMealItem[] };

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍎 Snack",
  other: "🍽️ Other",
};

interface Props {
  meal: FullMeal;
}

export function MealCard({ meal }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);

  const { mutate: deleteMeal } = useDeleteMeal();
  const { mutate: addItem, isPending: isAdding } = useAddMealItem();
  const { mutate: deleteItem } = useDeleteMealItem();

  const items = meal.meal_items ?? [];
  const macros = calcMealMacros(items);

  function handleAddFood(food: FoodItem, grams: number) {
    addItem(
      { mealId: meal.id, data: { food_item_id: food.id, quantity_grams: grams } },
      { onError: () => window.alert("Failed to add food item. Please try again.") },
    );
    setAdding(false);
  }

  function handleDeleteMeal() {
    if (!window.confirm("Delete this meal and all its items? This cannot be undone.")) return;
    deleteMeal(meal.id, {
      onError: () => window.alert("Failed to delete meal. Please try again."),
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {meal.name ?? MEAL_TYPE_LABEL[meal.meal_type] ?? meal.meal_type}
          </p>
          <p className="text-xs text-gray-400">
            {Math.round(macros.calories)} kcal · {Math.round(macros.protein_g)}g P ·{" "}
            {Math.round(macros.carbs_g)}g C · {Math.round(macros.fat_g)}g F
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAdding((v) => !v)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-700"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDeleteMeal}
            aria-label="Delete meal"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-400 dark:hover:bg-gray-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Food search */}
      {adding && (
        <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-700">
          <FoodSearch onSelect={handleAddFood} isAdding={isAdding} />
        </div>
      )}

      {/* Items list */}
      {expanded && items.length > 0 && (
        <ul className="border-t border-gray-100 dark:border-gray-700">
          {items.map((item) => {
            const food = item.food_items;
            const kcal = food
              ? Math.round((item.quantity_grams / 100) * food.calories_per_100g)
              : null;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between px-5 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {food?.name ?? "Unknown food"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.quantity_grams}g{kcal !== null ? ` · ${kcal} kcal` : ""}
                  </p>
                </div>
                <button
                  onClick={() =>
                    deleteItem(
                      { mealId: meal.id, itemId: item.id },
                      {
                        onError: () =>
                          window.alert("Failed to remove food item. Please try again."),
                      },
                    )
                  }
                  aria-label={`Remove ${food?.name ?? "food item"}`}
                  className="text-gray-300 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
