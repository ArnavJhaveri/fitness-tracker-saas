"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useCreateGoal } from "../hooks/useGoals";

const TYPE_OPTIONS = [
  { value: "weight_loss", label: "Weight loss" },
  { value: "weight_gain", label: "Weight gain" },
  { value: "muscle_gain", label: "Muscle gain" },
  { value: "improve_endurance", label: "Improve endurance" },
  { value: "improve_strength", label: "Improve strength" },
  { value: "calorie_target", label: "Calorie target" },
  { value: "water_target", label: "Water target" },
  { value: "sleep_target", label: "Sleep target" },
  { value: "workout_frequency", label: "Workout frequency" },
  { value: "custom", label: "Custom" },
];

interface Props {
  onSuccess?: () => void;
}

export function GoalForm({ onSuccess }: Props) {
  const [type, setType] = useState("custom");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [targetDate, setDate] = useState("");
  const [description, setDesc] = useState("");

  const { mutate, isPending } = useCreateGoal();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      {
        type,
        title,
        description: description || null,
        target_value: target ? parseFloat(target) : null,
        unit: unit || null,
        target_date: targetDate || null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setTarget("");
          setUnit("");
          setDate("");
          setDesc("");
          onSuccess?.();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select
        label="Goal type"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(e) => setType(e.target.value)}
      />

      <Input
        label="Title"
        placeholder="e.g. Reach 75 kg"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Target value"
          type="number"
          step="any"
          placeholder="e.g. 75"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <Input
          label="Unit"
          placeholder="kg, kcal, days…"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </div>

      <Input
        label="Target date"
        type="date"
        value={targetDate}
        onChange={(e) => setDate(e.target.value)}
      />

      <Textarea
        label="Description"
        placeholder="Optional notes about this goal"
        value={description}
        onChange={(e) => setDesc(e.target.value)}
        rows={2}
      />

      <Button type="submit" isLoading={isPending} className="w-full">
        Create goal
      </Button>
    </form>
  );
}
