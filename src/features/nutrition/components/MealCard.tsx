"use client";

import { useState } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { Meal, MealItem, FoodItem } from "@/types/database";
import { useDeleteMeal, useDeleteMealItem } from "../hooks/useNutrition";
import { calcMealMacros } from "../utils/macros";

type FullMealItem = MealItem & { food_items?: FoodItem };
type FullMeal = Meal & { meal_items?: FullMealItem[] };

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  other: "Other",
};

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
  other: "🍽️",
};

interface Props {
  meal: FullMeal;
}

/**
 * Card for a single meal — header with macros, expandable list of items.
 *
 * Adding more food is no longer done from inside the card (the embedded
 * FoodSearch was removed); the unified LogFoodFlow on the page handles all
 * "add food to today's <meal_type>" flows. That kept the card lighter and
 * removed a redundant code path.
 *
 * Per-item macros (kcal + P/C/F) are shown inline so users can see the
 * macro shape of the meal without arithmetic.
 */
export function MealCard({ meal }: Props) {
  const [expanded, setExpanded] = useState(true);

  const { mutate: deleteMeal } = useDeleteMeal();
  const { mutate: deleteItem } = useDeleteMealItem();

  const items = meal.meal_items ?? [];
  const macros = calcMealMacros(items);

  function handleDeleteMeal() {
    if (!window.confirm("Delete this meal and all its items? This cannot be undone.")) return;
    deleteMeal(meal.id, {
      onError: () => window.alert("Failed to delete meal. Please try again."),
    });
  }

  const emoji = MEAL_TYPE_EMOJI[meal.meal_type] ?? "🍽️";
  const label = meal.name ?? MEAL_TYPE_LABEL[meal.meal_type] ?? meal.meal_type;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-lg dark:bg-orange-950/30">
          <span aria-hidden="true">{emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
          <p className="truncate text-xs text-gray-500 tabular-nums dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {Math.round(macros.calories)} kcal
            </span>
            <span className="mx-1 text-gray-300">·</span>
            <span>
              P{Math.round(macros.protein_g)} · C{Math.round(macros.carbs_g)} · F
              {Math.round(macros.fat_g)}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse meal" : "Expand meal"}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDeleteMeal}
            aria-label="Delete meal"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-500 dark:hover:bg-gray-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Items list */}
      {expanded && items.length > 0 && (
        <ul className="border-t border-gray-100 dark:border-gray-700">
          {items.map((item) => {
            const food = item.food_items;
            const ratio = item.quantity_grams / 100;
            const kcal = food ? Math.round(food.calories_per_100g * ratio) : null;
            const protein = food ? Math.round(food.protein_per_100g * ratio) : null;
            const carbs = food ? Math.round(food.carbs_per_100g * ratio) : null;
            const fat = food ? Math.round(food.fat_per_100g * ratio) : null;
            return (
              <li
                key={item.id}
                className="group flex items-start justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-800 dark:text-gray-200">
                    {food?.name ?? "Unknown food"}
                  </p>
                  <p className="text-xs text-gray-400 tabular-nums">
                    {item.quantity_grams}g
                    {kcal !== null && (
                      <>
                        <span className="mx-1 text-gray-300">·</span>
                        <span className="text-gray-500 dark:text-gray-400">{kcal} kcal</span>
                        <span className="mx-1 text-gray-300">·</span>
                        <span>
                          P{protein} · C{carbs} · F{fat}
                        </span>
                      </>
                    )}
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
                  className="rounded p-1 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400 focus:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty state — meal exists but has no items yet */}
      {expanded && items.length === 0 && (
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-700">
          No items yet. Use &quot;Log food&quot; above to add one to this meal.
        </p>
      )}
    </div>
  );
}
