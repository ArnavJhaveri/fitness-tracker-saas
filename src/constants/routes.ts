/**
 * Single source of truth for all application routes.
 * Import these instead of hardcoding strings throughout the codebase.
 */
export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  // First-run wizard (skippable; soft-prompted via dashboard banner)
  ONBOARDING: "/onboarding",

  // Protected — dashboard
  DASHBOARD: "/dashboard",
  WORKOUTS: "/dashboard/workouts",
  EXERCISES: "/dashboard/exercises",
  NUTRITION: "/dashboard/nutrition",
  SLEEP: "/dashboard/sleep",
  WATER: "/dashboard/water",
  WEIGHT: "/dashboard/weight",
  GOALS: "/dashboard/goals",
  PHASES: "/dashboard/phases",
  ANALYTICS: "/dashboard/analytics",
  SETTINGS: "/dashboard/settings",

  // API — used by service layer for fetch() calls
  API: {
    HEALTH: "/api/health",
    WORKOUTS: "/api/workouts",
    WORKOUT_DETAIL: (id: string) => `/api/workouts/${id}`,
    // /api/nutrition has no top-level handler; sub-paths are:
    NUTRITION_MEALS: "/api/nutrition/meals",
    NUTRITION_FOOD_ITEMS: "/api/nutrition/food-items",
    SLEEP: "/api/sleep",
    WATER: "/api/water",
    WEIGHT: "/api/weight",
    GOALS: "/api/goals",
  },
} as const;
