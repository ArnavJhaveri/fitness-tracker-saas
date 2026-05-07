"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Select } from "@/components/ui/Select";

export interface NutritionValue {
  dietary_pattern: string;
  excluded_foods: string[];
}

interface Props {
  value: NutritionValue;
  onChange: (next: NutritionValue) => void;
}

const PATTERN_OPTIONS = [
  { value: "", label: "No specific pattern" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Keto / very-low-carb" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "paleo", label: "Paleo" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "other", label: "Other" },
];

export function NutritionStep({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function addExclusion() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (value.excluded_foods.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange({ ...value, excluded_foods: [...value.excluded_foods, trimmed] });
    setDraft("");
  }

  function removeExclusion(item: string) {
    onChange({
      ...value,
      excluded_foods: value.excluded_foods.filter((x) => x !== item),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
          Nutrition preferences
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Helps us suggest meals and filter the food database. Skip if it doesn&apos;t apply.
        </p>
      </header>

      <Select
        label="Dietary pattern"
        options={PATTERN_OPTIONS}
        value={value.dietary_pattern}
        onChange={(e) => onChange({ ...value, dietary_pattern: e.target.value })}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Foods to exclude
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Allergies, intolerances, or anything you don&apos;t eat. Press Enter or comma to add.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. peanuts, shellfish, dairy"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addExclusion();
              }
            }}
            className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            aria-label="Add a food to exclude"
          />
          <button
            type="button"
            onClick={addExclusion}
            className="rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={!draft.trim()}
          >
            Add
          </button>
        </div>

        {value.excluded_foods.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {value.excluded_foods.map((item) => (
              <li
                key={item}
                className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeExclusion(item)}
                  aria-label={`Remove ${item}`}
                  className="rounded-full p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
