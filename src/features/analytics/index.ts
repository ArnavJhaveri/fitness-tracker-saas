// Analytics feature — public API
export { TrendLineChart } from "./components/TrendLineChart";
export { WeeklyBarChart } from "./components/WeeklyBarChart";
export { useAnalytics, useTodaySummary, useThirtyDaySummary } from "./hooks/useAnalytics";
export { calcWorkoutStreak, calcWaterStreak, calcLongestWorkoutStreak } from "./utils/streaks";
export {
  workoutAdherence,
  // `calorieAdherence` is exported from "./utils/adherence" but not wired
  // into a UI panel yet. The analytics page already pulls calorie targets
  // from useResolvedTargets — adding a calorie-adherence tile is a one-line
  // change when product is ready for it.
  calorieAdherence,
  waterAdherence,
  sleepAdherence,
  overallScore,
} from "./utils/adherence";
export {
  movingAverage,
  periodDelta,
  latestWeight,
  formatDelta,
  trendDirection,
} from "./utils/trends";
