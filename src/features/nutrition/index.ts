// Nutrition feature — public API
export { FoodSearch } from "./components/FoodSearch";
export { MacroSummary } from "./components/MacroSummary";
export { MealCard } from "./components/MealCard";
export { MealForm } from "./components/MealForm";
export {
  useMeals,
  useCreateMeal,
  useDeleteMeal,
  useAddMealItem,
  useDeleteMealItem,
  MEALS_KEY,
} from "./hooks/useNutrition";
export { useFoodSearch } from "./hooks/useFoodSearch";
export { calcMealMacros, calcDayMacros, calcMacroPercents } from "./utils/macros";
export type { MacroTotals } from "./utils/macros";
