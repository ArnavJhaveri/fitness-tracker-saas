"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useCreateExercise, useUpdateExercise } from "../hooks/useExercises";
import { KNOWN_CATEGORIES } from "@/lib/validations";
import type { CreateExerciseInput } from "@/lib/validations";
import type { Exercise, MuscleGroup } from "@/types/database";

const MUSCLE_OPTIONS: { value: MuscleGroup; label: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "forearms", label: "Forearms" },
  { value: "core", label: "Core" },
  { value: "glutes", label: "Glutes" },
  { value: "quads", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "calves", label: "Calves" },
  { value: "full_body", label: "Full body" },
  { value: "cardio", label: "Cardio" },
];

const CATEGORY_OPTIONS = [
  ...KNOWN_CATEGORIES.map((c) => ({
    value: c,
    label: c.charAt(0).toUpperCase() + c.slice(1),
  })),
];

interface Props {
  /** When provided, edit mode — pre-fills with existing values */
  exercise?: Exercise;
  /** Called after a successful create/update with the resulting row */
  onSuccess?: (exercise: Exercise) => void;
  /** Called when the user clicks Cancel; if absent, the form has no Cancel button */
  onCancel?: () => void;
}

/**
 * Form for creating or editing a custom exercise.
 *
 * Single-form approach — the same component handles both create and update
 * by switching mutation hook based on whether `exercise` is supplied. This
 * keeps the form layout identical between flows so users can reuse muscle
 * memory.
 */
export function ExerciseForm({ exercise, onSuccess, onCancel }: Props) {
  const isEdit = !!exercise;
  const [name, setName] = useState(exercise?.name ?? "");
  const [category, setCategory] = useState(exercise?.category ?? "strength");
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>(
    exercise?.primary_muscle_group ?? "full_body",
  );
  const [instructions, setInstructions] = useState(exercise?.instructions ?? "");
  const [err, setErr] = useState("");

  const create = useCreateExercise();
  const update = useUpdateExercise();
  const isPending = create.isPending || update.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Name is required.");
      return;
    }

    const payload: CreateExerciseInput = {
      name: trimmed,
      category,
      primary_muscle_group: primaryMuscle,
      // secondary_muscle_groups is intentionally omitted from this v1 form to
      // keep it simple. Users editing existing exercises will retain whatever
      // values they had via the API's PATCH semantics.
      secondary_muscle_groups: exercise?.secondary_muscle_groups ?? [],
      instructions: instructions.trim() ? instructions.trim() : null,
    };

    if (isEdit && exercise) {
      update.mutate(
        { id: exercise.id, input: payload },
        {
          onSuccess: (data) => onSuccess?.(data),
          onError: (e) => setErr(e.message || "Failed to update exercise. Please try again."),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: (data) => onSuccess?.(data),
        onError: (e) => setErr(e.message || "Failed to create exercise. Please try again."),
      });
    }
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

      <Input
        label="Name"
        placeholder="e.g. Bulgarian Split Squat"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Select
          label="Primary muscle"
          options={MUSCLE_OPTIONS}
          value={primaryMuscle}
          onChange={(e) => setPrimaryMuscle(e.target.value as MuscleGroup)}
        />
      </div>

      <Textarea
        label="Instructions (optional)"
        placeholder="Cue notes, form pointers, anything that'll remind future you how to do this lift well."
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={3}
        maxLength={2000}
      />

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isPending}>
          {isEdit ? "Save changes" : "Create exercise"}
        </Button>
      </div>
    </form>
  );
}
