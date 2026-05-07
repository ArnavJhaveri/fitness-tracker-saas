"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import type { ActivityLevel, SexAtBirth } from "@/types/database";

/**
 * State shape for AboutYouStep.
 *
 * Height is split into two raw input strings (`height_ft_value` and
 * `height_in_value`) when the user picks ft/in, OR a single `height_cm_value`
 * for cm. Splitting prevents the previous "5.9 ft → 179.8 cm" bug, where a
 * user typing "5.9" expected 5'9" (175 cm) but got 5.9 feet decimal (180 cm).
 */
export interface AboutYouValue {
  full_name: string;
  date_of_birth: string;
  sex_at_birth: SexAtBirth | "";
  /** Used when height_unit === "cm" */
  height_cm_value: string;
  /** Used when height_unit === "ft" — whole feet */
  height_ft_value: string;
  /** Used when height_unit === "ft" — whole inches (0–11) */
  height_in_value: string;
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
  { value: "", label: "Skip" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const ACTIVITY_OPTIONS = [
  { value: "", label: "Skip" },
  { value: "sedentary", label: "Sedentary — desk job, little exercise" },
  { value: "light", label: "Light — 1–3 sessions a week" },
  { value: "moderate", label: "Moderate — 3–5 sessions a week" },
  { value: "very_active", label: "Very active — 6–7 sessions a week" },
  { value: "extra_active", label: "Extra active — daily intense training" },
];

// ─── Pure conversion helpers (exported for the wizard's buildPayload) ────────

const CM_PER_INCH = 2.54;
const KG_PER_LB = 1 / 2.20462;

/**
 * Convert feet + inches to centimetres.
 * Returns null if BOTH inputs are empty/invalid (fully skipped); otherwise
 * treats missing parts as 0 (e.g. "5 ft 0 in" if only feet are entered).
 */
export function ftInToCm(ft: string, inches: string): number | null {
  const ftNum = parseFloat(ft);
  const inNum = parseFloat(inches);
  const ftValid = Number.isFinite(ftNum);
  const inValid = Number.isFinite(inNum);
  if (!ftValid && !inValid) return null;
  const totalInches = (ftValid ? ftNum * 12 : 0) + (inValid ? inNum : 0);
  return Math.round(totalInches * CM_PER_INCH * 10) / 10;
}

/** Convert pounds to kilograms (returns null on invalid input) */
export function lbsToKg(lbs: string): number | null {
  const n = parseFloat(lbs);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * KG_PER_LB * 100) / 100;
}

/** Identity-style passthrough for kg input → number, null on invalid */
export function parseKg(kg: string): number | null {
  const n = parseFloat(kg);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/** Compatibility shim — convert lbs ↔ kg without going through the form */
export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}

// ─── Component ────────────────────────────────────────────────────────────────

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

        {/* Height with unit toggle and a cm OR ft+in input shape that prevents
            the "5.9 ft is actually 5'10.8\"" UX trap. */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Height</label>
          <div className="flex gap-2">
            {value.height_unit === "cm" ? (
              <input
                type="number"
                step="any"
                min={50}
                max={280}
                placeholder="175"
                value={value.height_cm_value}
                onChange={(e) => patch("height_cm_value", e.target.value)}
                aria-label="Height in centimetres"
                className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            ) : (
              <div className="flex flex-1 gap-2">
                <div className="flex flex-1 items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={9}
                    placeholder="5"
                    value={value.height_ft_value}
                    onChange={(e) => patch("height_ft_value", e.target.value)}
                    aria-label="Height — feet"
                    className="h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">ft</span>
                </div>
                <div className="flex flex-1 items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={11}
                    step="any"
                    placeholder="9"
                    value={value.height_in_value}
                    onChange={(e) => patch("height_in_value", e.target.value)}
                    aria-label="Height — inches"
                    className="h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">in</span>
                </div>
              </div>
            )}
            <UnitToggle
              options={["cm", "ft"]}
              value={value.height_unit}
              onChange={(u) => patch("height_unit", u as "cm" | "ft")}
              aria-label="Height units"
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
              min={20}
              max={400}
              placeholder={value.weight_unit === "kg" ? "75" : "165"}
              value={value.weight_value}
              onChange={(e) => patch("weight_value", e.target.value)}
              aria-label={`Current weight in ${value.weight_unit === "kg" ? "kilograms" : "pounds"}`}
              className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <UnitToggle
              options={["kg", "lbs"]}
              value={value.weight_unit}
              onChange={(u) => patch("weight_unit", u as "kg" | "lbs")}
              aria-label="Weight units"
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
  "aria-label": ariaLabel,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  "aria-label"?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
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
