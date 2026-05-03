export const APP_NAME = "FitTrack";
export const APP_DESCRIPTION =
  "Your intelligent fitness companion — track workouts, nutrition, sleep, and progress in one place.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Default daily targets — users can override in their profile/goals */
export const DEFAULTS = {
  WATER_TARGET_ML: 2500,
  SLEEP_TARGET_MINUTES: 8 * 60,
  CALORIE_TARGET_KCAL: 2000,
} as const;

/** Macronutrient target ratios (protein / carbs / fat) — classic balanced split */
export const MACRO_RATIOS = {
  PROTEIN: 0.3,
  CARBS: 0.4,
  FAT: 0.3,
} as const;

/** Calories per gram for each macronutrient */
export const CALORIES_PER_GRAM = {
  PROTEIN: 4,
  CARBS: 4,
  FAT: 9,
} as const;

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;
