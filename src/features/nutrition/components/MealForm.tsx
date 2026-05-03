"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCreateMeal } from "../hooks/useNutrition";

const MEAL_TYPE_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "other", label: "Other" },
];

interface Props {
  onSuccess?: () => void;
}

export function MealForm({ onSuccess }: Props) {
  const [mealType, setMealType] = useState("breakfast");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const { mutate, isPending } = useCreateMeal();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    mutate(
      { meal_type: mealType, name: name || null, logged_at: new Date().toISOString() },
      {
        onSuccess: () => {
          setName("");
          onSuccess?.();
        },
        onError: (e) => setErr(e.message || "Failed to create meal. Please try again."),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {err && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
        >
          {err}
        </p>
      )}
      <Select
        label="Meal type"
        value={mealType}
        onChange={(e) => setMealType(e.target.value)}
        options={MEAL_TYPE_OPTIONS}
      />
      <Input
        label="Custom name"
        placeholder="e.g. Post-workout shake (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" isLoading={isPending} className="w-full">
        Create meal
      </Button>
    </form>
  );
}
