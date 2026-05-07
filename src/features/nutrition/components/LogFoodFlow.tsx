"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";
import { localDateStr } from "@/lib/utils/date";
import { useDebouncedValue } from "@/lib/utils/useDebouncedValue";
import { MEAL_TYPES, getMealTypeMeta } from "@/lib/registry/meal-types";
import { useFoodSearch } from "../hooks/useFoodSearch";
import { useAddMealItem, useCreateMeal, useMeals, useRecentFoods } from "../hooks/useNutrition";
import type { FoodItem, Meal, MealType } from "@/types/database";

/**
 * Combined "log food" flow that replaces the old
 *   create empty meal → search → grams → add item
 * five-tap dance with a single screen:
 *
 *   1. Pick or auto-detect meal type (breakfast / lunch / dinner / snack)
 *   2. One-tap your recently-logged foods, OR search the catalogue
 *   3. Adjust quantity inline with live macro preview
 *   4. Tap Log → meal of correct type is auto-created if missing, item appended
 *
 * The user never thinks about "creating a meal". Meals are derived from
 * meal_type + today's date; the flow finds-or-creates as needed.
 *
 * State machine:
 *   Idle (no food picked) → search results visible
 *   Picked (food selected) → quantity + preview + Log button
 */
interface Props {
  /** Closed by the parent when the user cancels or finishes a series of logs. */
  onClose: () => void;
}

// Meal-type chips drawn from the shared registry. We exclude "other" — the
// chip row is for the four primary windows; a meal logged as "other" comes
// from the import script or a future picker.
const MEAL_TYPE_OPTIONS = MEAL_TYPES.filter((m) => m.type !== "other");

/**
 * Pick the most likely meal type based on the user's local clock.
 * Used as the default when the user opens the logger so they don't usually
 * have to change it.
 */
function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 17) return "snack";
  if (h < 21) return "dinner";
  return "snack";
}

export function LogFoodFlow({ onClose }: Props) {
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType());
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [err, setErr] = useState<string | null>(null);

  // Debounce the search query so each keystroke doesn't fire a new request.
  // Without this, typing "chicken" would queue 7 in-flight queries — wasted
  // bandwidth + a race where late responses overwrite earlier ones.
  const debouncedQuery = useDebouncedValue(query, 250);
  const { data: searchResults, isFetching } = useFoodSearch(debouncedQuery);
  const { data: recent } = useRecentFoods();
  const { data: todaysMeals = [] } = useMeals();

  const createMeal = useCreateMeal();
  const addItem = useAddMealItem();
  const isPending = createMeal.isPending || addItem.isPending;

  // ─── Live preview of selected food at chosen quantity ──────────────────
  const preview = useMemo(() => {
    if (!picked) return null;
    const g = parseFloat(grams);
    if (!Number.isFinite(g) || g <= 0) return null;
    const ratio = g / 100;
    return {
      kcal: Math.round(picked.calories_per_100g * ratio),
      protein_g: Math.round(picked.protein_per_100g * ratio),
      carbs_g: Math.round(picked.carbs_per_100g * ratio),
      fat_g: Math.round(picked.fat_per_100g * ratio),
    };
  }, [picked, grams]);

  // ─── Submit handler ─────────────────────────────────────────────────────

  /**
   * Find or create today's meal of the chosen type, then add the picked
   * food. Two requests in the worst case (create + add); a single request
   * when a meal of that type already exists for today.
   */
  async function handleLog() {
    setErr(null);
    if (!picked) return;
    const g = parseFloat(grams);
    if (!Number.isFinite(g) || g <= 0) {
      setErr("Quantity must be a positive number.");
      return;
    }

    const existing = (todaysMeals as Meal[]).find((m) => m.meal_type === mealType);
    let mealId = existing?.id;

    if (!mealId) {
      try {
        const created = await createMeal.mutateAsync({
          meal_type: mealType,
          name: null,
          // Use a sensible mid-meal-window timestamp so the row sorts under
          // today's date in any reasonable timezone.
          logged_at: new Date(
            `${localDateStr()}T${String(getMealTypeMeta(mealType).defaultHour).padStart(2, "0")}:00:00`,
          ).toISOString(),
        });
        mealId = created.id;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to create meal.");
        return;
      }
    }

    try {
      await addItem.mutateAsync({
        mealId,
        data: { food_item_id: picked.id, quantity_grams: g },
      });
      // Reset for the next item — keep the meal type so consecutive logs
      // stay in the same bucket without re-tapping it.
      setPicked(null);
      setQuery("");
      setGrams("100");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add food. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Meal type chips */}
      <div role="radiogroup" aria-label="Meal type" className="flex flex-wrap gap-1.5">
        {MEAL_TYPE_OPTIONS.map((opt) => {
          const selected = mealType === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMealType(opt.type)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
              )}
            >
              <span aria-hidden="true">{opt.emoji}</span> {opt.label}
            </button>
          );
        })}
      </div>

      {/* Recent foods (1-tap quick-add) — only when nothing's been picked */}
      {!picked && recent && recent.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            <Sparkles className="h-3 w-3" /> Recent
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => setPicked(food)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30"
              >
                {food.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      {!picked && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search foods…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search food catalogue"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-9 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Show the result panel as soon as the user has typed enough,
              so the skeleton/spinner appears immediately (rather than
              blank for the 250ms debounce window). The `enabled` flag on
              useFoodSearch still gates the actual fetch on the debounced
              value reaching length >= 2. */}
          {debouncedQuery.length >= 2 && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              {isFetching && (
                <div className="p-3">
                  <Skeleton lines={3} />
                </div>
              )}
              {!isFetching && (searchResults?.length ?? 0) === 0 && (
                <p className="p-3 text-center text-sm text-gray-400">
                  No results for &quot;{query}&quot;
                </p>
              )}
              {!isFetching &&
                searchResults?.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => setPicked(food)}
                    className="flex w-full items-start justify-between gap-3 border-b border-gray-100 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {food.name}
                        </p>
                        {food.is_custom && (
                          <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-indigo-700 uppercase dark:bg-indigo-900/30 dark:text-indigo-300">
                            Custom
                          </span>
                        )}
                      </div>
                      {food.brand && <p className="truncate text-xs text-gray-400">{food.brand}</p>}
                    </div>
                    <p className="shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">
                        {Math.round(food.calories_per_100g)} kcal
                      </span>
                      <br />
                      <span className="text-[10px] tabular-nums">
                        P{Math.round(food.protein_per_100g)} · C{Math.round(food.carbs_per_100g)} ·
                        F{Math.round(food.fat_per_100g)}
                      </span>
                      <br />
                      <span className="text-[10px] text-gray-400">per 100g</span>
                    </p>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Picked — quantity + preview */}
      {picked && (
        <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {picked.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(picked.calories_per_100g)} kcal · P{Math.round(picked.protein_per_100g)}
                g · C{Math.round(picked.carbs_per_100g)}g · F{Math.round(picked.fat_per_100g)}g{" "}
                <span className="text-gray-400">/ 100g</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setGrams("100");
              }}
              aria-label="Clear selection"
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quantity controls */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Quantity</span>
              <input
                type="number"
                step="any"
                min={1}
                max={10000}
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                aria-label="Quantity in grams"
                className="h-9 w-24 rounded-lg border border-gray-300 bg-white px-2 text-right text-sm tabular-nums focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900"
              />
              <span className="text-xs text-gray-500">g</span>
            </label>
            {/* Quick quantity presets — most-common 50/100/150/200g */}
            <div className="flex gap-1">
              {[50, 100, 150, 200].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrams(String(g))}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                    grams === String(g)
                      ? "border-indigo-400 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
                  )}
                >
                  {g}g
                </button>
              ))}
            </div>
          </div>

          {/* Live preview */}
          {preview && (
            <dl className="grid grid-cols-4 gap-2 rounded-lg bg-white p-2 text-center dark:bg-gray-900">
              <PreviewStat label="kcal" value={preview.kcal} />
              <PreviewStat label="protein" value={`${preview.protein_g}g`} />
              <PreviewStat label="carbs" value={`${preview.carbs_g}g`} />
              <PreviewStat label="fat" value={`${preview.fat_g}g`} />
            </dl>
          )}
        </div>
      )}

      {err && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
        >
          {err}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          {/* "Cancel" rather than "Done" — when the user clicks "Log to lunch"
              the panel stays open for sequential logging; this footer button
              is the explicit close, not a confirm. */}
          Cancel
        </Button>
        {picked && (
          <Button
            type="button"
            onClick={handleLog}
            isLoading={isPending}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Log to {getMealTypeMeta(mealType).label.toLowerCase()}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PreviewStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col">
      <span className="text-base font-bold text-gray-900 tabular-nums dark:text-gray-100">
        {value}
      </span>
      <span className="text-[10px] tracking-wider text-gray-500 uppercase dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}
