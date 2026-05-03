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

  const { mutate, isPending } = useCreateMeal();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { meal_type: mealType, name: name || null, logged_at: new Date().toISOString() },
      {
        onSuccess: () => {
          setName("");
          onSuccess?.();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
