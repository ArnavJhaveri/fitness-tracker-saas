// Analytics feature — public API
export { TrendLineChart } from "./components/TrendLineChart";
export { WeeklyBarChart } from "./components/WeeklyBarChart";
export { useAnalytics, useTodaySummary, useThirtyDaySummary } from "./hooks/useAnalytics";
export { calcWorkoutStreak, calcWaterStreak, calcLongestWorkoutStreak } from "./utils/streaks";
export {
  workoutAdherence,
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
