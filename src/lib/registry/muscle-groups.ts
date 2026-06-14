import type { MuscleGroup } from "@/types/database";

export interface MuscleGroupMeta {
  value: MuscleGroup;
  label: string;
}

export const MUSCLE_GROUPS: readonly MuscleGroupMeta[] = [
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
] as const;

export const MUSCLE_GROUP_VALUES = MUSCLE_GROUPS.map((m) => m.value) as [
  MuscleGroup,
  ...MuscleGroup[],
];
