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

  // Protected — dashboard
  DASHBOARD: "/dashboard",
  WORKOUTS: "/dashboard/workouts",
  WORKOUT_NEW: "/dashboard/workouts/new",
  WORKOUT_DETAIL: (id: string) => `/dashboard/workouts/${id}`,
  NUTRITION: "/dashboard/nutrition",
  SLEEP: "/dashboard/sleep",
  WATER: "/dashboard/water",
  WEIGHT: "/dashboard/weight",
  GOALS: "/dashboard/goals",
  ANALYTICS: "/dashboard/analytics",
  SETTINGS: "/dashboard/settings",

  // API
  API: {
    HEALTH: "/api/health",
    WORKOUTS: "/api/workouts",
    WORKOUT_DETAIL: (id: string) => `/api/workouts/${id}`,
    NUTRITION: "/api/nutrition",
    SLEEP: "/api/sleep",
    WATER: "/api/water",
    WEIGHT: "/api/weight",
    GOALS: "/api/goals",
  },
} as const;
