"use client";

export const queryKeys = {
  analytics: () => ["analytics"] as const,
  exercises: () => ["exercises"] as const,
  goals: () => ["goals"] as const,
  goals_filtered: (status?: string) => ["goals", status] as const,
  nutrition: () => ["nutrition"] as const,
  meals: () => ["meals"] as const,
  meal: (id: string) => ["meals", id] as const,
  foodItems: () => ["food-items"] as const,
  recentFoods: () => ["recent-foods"] as const,
  phases: () => ["phases"] as const,
  settings: () => ["settings"] as const,
  sleep: () => ["sleep"] as const,
  water: () => ["water"] as const,
  water_day: (date: string) => ["water", date] as const,
  weight: () => ["weight"] as const,
  workouts: () => ["workouts"] as const,
  workout: (id: string) => ["workouts", id] as const,
} as const;

export function invalidateWithAnalytics(
  qc: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => void },
  ...keys: (readonly unknown[])[]
) {
  for (const key of keys) {
    qc.invalidateQueries({ queryKey: key });
  }
  qc.invalidateQueries({ queryKey: queryKeys.analytics() });
}
