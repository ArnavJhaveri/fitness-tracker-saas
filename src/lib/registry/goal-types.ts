/**
 * Curated registry of goal types with rich UI metadata.
 *
 * As of migration 003 the DB column has no CHECK constraint, so users can
 * create goals with arbitrary `type` strings. Types listed here get an icon,
 * default unit, and rich-UI affordances. Unknown types render generically.
 */
import type { GoalType } from "@/types/database";

export interface GoalTypeMeta {
  type: GoalType;
  label: string;
  description: string;
  defaultUnit: string | null;
  /**
   * How does the value progress? "lower" = lower target_value is better
   * (weight loss, time goals); "higher" = higher is better.
   */
  direction: "higher" | "lower" | "neutral";
}

export const GOAL_TYPES: GoalTypeMeta[] = [
  {
    type: "weight_loss",
    label: "Weight loss",
    description: "Reach a target weight by losing",
    defaultUnit: "kg",
    direction: "lower",
  },
  {
    type: "weight_gain",
    label: "Weight gain",
    description: "Reach a target weight by gaining",
    defaultUnit: "kg",
    direction: "higher",
  },
  {
    type: "muscle_gain",
    label: "Muscle gain",
    description: "Add lean mass over time",
    defaultUnit: "kg",
    direction: "higher",
  },
  {
    type: "improve_endurance",
    label: "Improve endurance",
    description: "Run further, cycle longer, etc.",
    defaultUnit: "km",
    direction: "higher",
  },
  {
    type: "improve_strength",
    label: "Improve strength",
    description: "Lift more weight on a key exercise",
    defaultUnit: "kg",
    direction: "higher",
  },
  {
    type: "calorie_target",
    label: "Calorie target",
    description: "Hit a daily calorie intake",
    defaultUnit: "kcal",
    direction: "neutral",
  },
  {
    type: "water_target",
    label: "Water target",
    description: "Hit a daily hydration goal",
    defaultUnit: "ml",
    direction: "higher",
  },
  {
    type: "sleep_target",
    label: "Sleep target",
    description: "Hit a daily sleep duration",
    defaultUnit: "hrs",
    direction: "higher",
  },
  {
    type: "workout_frequency",
    label: "Workout frequency",
    description: "Train a certain number of days per week",
    defaultUnit: "days/wk",
    direction: "higher",
  },
  {
    type: "custom",
    label: "Custom",
    description: "Define your own measurable goal",
    defaultUnit: null,
    direction: "neutral",
  },
];

const GOAL_TYPE_INDEX: ReadonlyMap<string, GoalTypeMeta> = new Map(
  GOAL_TYPES.map((g) => [g.type, g]),
);

/**
 * Resolve a goal type to its metadata. Unknown types fall back to a generic
 * `custom` shape so the UI never breaks.
 */
export function getGoalTypeMeta(type: string | null | undefined): GoalTypeMeta {
  if (!type) return GOAL_TYPE_INDEX.get("custom")!;
  return GOAL_TYPE_INDEX.get(type) ?? GOAL_TYPE_INDEX.get("custom")!;
}
