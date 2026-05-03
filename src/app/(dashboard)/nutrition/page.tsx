"use client";

import { useState } from "react";
import { Plus, Utensils } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MacroSummary } from "@/features/nutrition/components/MacroSummary";
import { MealCard } from "@/features/nutrition/components/MealCard";
import { MealForm } from "@/features/nutrition/components/MealForm";
import { useMeals } from "@/features/nutrition/hooks/useNutrition";
import { calcDayMacros } from "@/features/nutrition/utils/macros";
import { useSettings } from "@/features/settings/hooks/useSettings";
import type { Meal, MealItem, FoodItem } from "@/types/database";

type FullMealItem = MealItem & { food_items?: FoodItem };
type FullMeal = Meal & { meal_items?: FullMealItem[] };

export default function NutritionPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: meals = [], isLoading } = useMeals();
  const { data: settings } = useSettings();

  const macros = calcDayMacros(meals as FullMeal[]);

  // Use user's saved targets; fall back to sensible defaults until settings load
  const targets = {
    calories: settings?.daily_calorie_target ?? undefined,
    protein_g: settings?.daily_protein_target_g ?? undefined,
    // carbs/fat targets not stored individually — omit so MacroSummary hides those bars
  };

  return (
    <div className="flex flex-col">
      <Header title="Nutrition" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Macro summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s macros</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
            ) : (
              <MacroSummary totals={macros} targets={targets} />
            )}
          </CardContent>
        </Card>

        {/* Add meal */}
        {showForm ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add meal</CardTitle>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <MealForm onSuccess={() => setShowForm(false)} />
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" /> Add meal
          </Button>
        )}

        {/* Meal list */}
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
            description="Add a meal above to start tracking your nutrition."
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
