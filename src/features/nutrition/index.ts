// Nutrition feature — public API
export { LogFoodFlow } from "./components/LogFoodFlow";
export { MacroSummary } from "./components/MacroSummary";
export { MealCard } from "./components/MealCard";
export {
  MEALS_KEY,
  RECENT_FOODS_KEY,
  useAddMealItem,
  useCreateMeal,
  useDeleteMeal,
  useDeleteMealItem,
  useMeals,
  useRecentFoods,
} from "./hooks/useNutrition";
export { useFoodSearch } from "./hooks/useFoodSearch";
export { calcMealMacros, calcDayMacros, calcMacroPercents } from "./utils/macros";
export type { MacroTotals } from "./utils/macros";
