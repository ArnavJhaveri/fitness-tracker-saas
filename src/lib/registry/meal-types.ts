/**
 * Curated registry for meal types — emoji + display label + sort order.
 *
 * Single source of truth so MealCard, LogFoodFlow, the nutrition page, and
 * any future "filter by meal type" UI all show the same labels in the same
 * order. The DB column has a CHECK constraint (`breakfast | lunch | dinner |
 * snack | other`); this file mirrors that enum.
 */
import type { MealType } from "@/types/database";

export interface MealTypeMeta {
  type: MealType;
  /** Sentence-case label, e.g. "Breakfast" */
  label: string;
  /** Decorative emoji — always rendered with `aria-hidden="true"` */
  emoji: string;
  /** Default UTC hour at which a meal of this type is logged when only the
   *  date is known (used by the import script + LogFoodFlow auto-create). */
  defaultHour: number;
  /** Sort order in pickers — breakfast first, "other" last. */
  order: number;
}

export const MEAL_TYPES: readonly MealTypeMeta[] = [
  { type: "breakfast", label: "Breakfast", emoji: "🌅", defaultHour: 8, order: 0 },
  { type: "lunch", label: "Lunch", emoji: "☀️", defaultHour: 13, order: 1 },
  { type: "dinner", label: "Dinner", emoji: "🌙", defaultHour: 19, order: 2 },
  { type: "snack", label: "Snack", emoji: "🍎", defaultHour: 16, order: 3 },
  { type: "other", label: "Other", emoji: "🍽️", defaultHour: 12, order: 4 },
] as const;

const MEAL_TYPE_INDEX: ReadonlyMap<string, MealTypeMeta> = new Map(
  MEAL_TYPES.map((m) => [m.type, m]),
);

/**
 * Resolve a meal type string to its metadata. Falls back to the "other"
 * row if the input is unrecognised — keeps UI rendering safe even if the
 * DB ever holds a value the registry hasn't been updated for.
 */
export function getMealTypeMeta(type: string | null | undefined): MealTypeMeta {
  if (!type) return MEAL_TYPE_INDEX.get("other")!;
  return MEAL_TYPE_INDEX.get(type) ?? MEAL_TYPE_INDEX.get("other")!;
}
