"use client";

import { useState } from "react";
import { Plus, Utensils, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LogFoodFlow } from "@/features/nutrition/components/LogFoodFlow";
import { MacroSummary } from "@/features/nutrition/components/MacroSummary";
import { MealCard } from "@/features/nutrition/components/MealCard";
import { useMeals } from "@/features/nutrition/hooks/useNutrition";
import { calcDayMacros } from "@/features/nutrition/utils/macros";
import { useResolvedTargets } from "@/features/phases/hooks/useResolvedTargets";
import type { Meal, MealItem, FoodItem } from "@/types/database";

type FullMealItem = MealItem & { food_items?: FoodItem };
type FullMeal = Meal & { meal_items?: FullMealItem[] };

export default function NutritionPage() {
  const [logging, setLogging] = useState(false);
  const { data: meals = [], isLoading } = useMeals();
  const { data: targets } = useResolvedTargets();

  const macros = calcDayMacros(meals as FullMeal[]);

  // Pull all four macro targets from the resolved targets hook so an active
  // phase's overrides take effect AND companion-mode users (no targets)
  // still see their totals without broken progress bars.
  const macroTargets = {
    calories: targets?.daily_calorie_target ?? null,
    protein_g: targets?.daily_protein_target_g ?? null,
    carbs_g: targets?.daily_carbs_target_g ?? null,
    fat_g: targets?.daily_fat_target_g ?? null,
  };

  return (
    <div className="flex flex-col">
      <Header title="Nutrition" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Today's macros — pinned at top */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s macros</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
            ) : (
              <MacroSummary totals={macros} targets={macroTargets} />
            )}
          </CardContent>
        </Card>

        {/* Log food — collapses into a single button when not in use */}
        {logging ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Log food</CardTitle>
                <button
                  type="button"
                  onClick={() => setLogging(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <LogFoodFlow onClose={() => setLogging(false)} />
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setLogging(true)} className="flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" /> Log food
          </Button>
        )}

        {/* Today's meals */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No meals logged today"
            description="Log a food above — meals are auto-grouped by breakfast / lunch / dinner / snack."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {(meals as FullMeal[]).map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
