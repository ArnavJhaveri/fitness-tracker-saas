"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import type { ActivityLevel, SexAtBirth } from "@/types/database";

export interface AboutYouValue {
  full_name: string;
  date_of_birth: string;
  sex_at_birth: SexAtBirth | "";
  height_value: string; // raw input string in chosen unit
  weight_value: string; // raw input string in chosen unit
  height_unit: "cm" | "ft";
  weight_unit: "kg" | "lbs";
  activity_level: ActivityLevel | "";
}

interface Props {
  value: AboutYouValue;
  onChange: (next: AboutYouValue) => void;
}

const SEX_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer_not_to_say", label: "Prefer not to say (explicit)" },
];

const ACTIVITY_OPTIONS = [
  { value: "", label: "Skip — I'd rather not say" },
  { value: "sedentary", label: "Sedentary — desk job, little exercise" },
  { value: "light", label: "Light — 1–3 sessions a week" },
  { value: "moderate", label: "Moderate — 3–5 sessions a week" },
  { value: "very_active", label: "Very active — 6–7 sessions a week" },
  { value: "extra_active", label: "Extra active — daily intense training" },
];

export function AboutYouStep({ value, onChange }: Props) {
  function patch<K extends keyof AboutYouValue>(key: K, v: AboutYouValue[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
          A bit about you
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Used only to suggest reasonable starting targets. Every field is optional — skip anything
          you&apos;d rather not share.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <Input
          label="Name (optional)"
          placeholder="e.g. Alex"
          value={value.full_name}
          onChange={(e) => patch("full_name", e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Date of birth"
            type="date"
            value={value.date_of_birth}
            onChange={(e) => patch("date_of_birth", e.target.value)}
          />
          <Select
            label="Sex at birth"
            options={SEX_OPTIONS}
            value={value.sex_at_birth}
            onChange={(e) => patch("sex_at_birth", e.target.value as SexAtBirth | "")}
          />
        </div>

        {/* Height with unit toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Height</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder={value.height_unit === "cm" ? "175" : "5.9"}
              value={value.height_value}
              onChange={(e) => patch("height_value", e.target.value)}
              className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <UnitToggle
              options={["cm", "ft"]}
              value={value.height_unit}
              onChange={(u) => patch("height_unit", u as "cm" | "ft")}
            />
          </div>
        </div>

        {/* Weight with unit toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current weight
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder={value.weight_unit === "kg" ? "75" : "165"}
              value={value.weight_value}
              onChange={(e) => patch("weight_value", e.target.value)}
              className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <UnitToggle
              options={["kg", "lbs"]}
              value={value.weight_unit}
              onChange={(u) => patch("weight_unit", u as "kg" | "lbs")}
            />
          </div>
        </div>

        <Select
          label="Activity level"
          options={ACTIVITY_OPTIONS}
          value={value.activity_level}
          onChange={(e) => patch("activity_level", e.target.value as ActivityLevel | "")}
        />
      </div>
    </div>
  );
}

function UnitToggle({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      className="flex h-10 shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-white text-sm font-medium dark:border-gray-600 dark:bg-gray-900"
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 transition-colors",
            value === opt
              ? "bg-indigo-500 text-white"
              : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
