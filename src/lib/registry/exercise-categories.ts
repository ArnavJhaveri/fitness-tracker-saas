/**
 * Curated registry of exercise categories with display metadata.
 *
 * As of migration 003 the `exercises.category` column has no CHECK
 * constraint — users can introduce arbitrary categories like
 * "powerlifting" or "sports-specific". The categories listed here get
 * rich UI (icon, ordering); unknown categories render with the `other`
 * fallback metadata.
 *
 * Adding a category to the curated list is a code-only change — no
 * migration. The Zod input schema in src/lib/validations/workout.ts
 * already accepts arbitrary non-empty strings; this registry only
 * decides the visual treatment in pickers and lists.
 */
import type { ExerciseCategory } from "@/types/database";

export interface ExerciseCategoryMeta {
  category: ExerciseCategory;
  /** Sentence-case label, e.g. "Strength" */
  label: string;
  /** Sort order in pickers — strength first, "other" last */
  order: number;
}

export const EXERCISE_CATEGORIES: readonly ExerciseCategoryMeta[] = [
  { category: "strength", label: "Strength", order: 0 },
  { category: "cardio", label: "Cardio", order: 1 },
  { category: "calisthenics", label: "Calisthenics", order: 2 },
  { category: "flexibility", label: "Flexibility", order: 3 },
  { category: "mobility", label: "Mobility", order: 4 },
  { category: "yoga", label: "Yoga", order: 5 },
  { category: "sports", label: "Sports", order: 6 },
  { category: "other", label: "Other", order: 7 },
] as const;

const INDEX: ReadonlyMap<string, ExerciseCategoryMeta> = new Map(
  EXERCISE_CATEGORIES.map((c) => [c.category, c]),
);

/**
 * Resolve a category string to its metadata. Falls back to the "other"
 * row for any unknown user-defined category — keeps UI rendering safe.
 */
export function getExerciseCategoryMeta(category: string | null | undefined): ExerciseCategoryMeta {
  if (!category) return INDEX.get("other")!;
  return INDEX.get(category) ?? INDEX.get("other")!;
}
