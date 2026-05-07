"use client";

import { useMemo, useState } from "react";
import { Sparkles, Target } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import {
  ageFromDOB,
  calcBMR,
  calcTDEE,
  suggestCalorieTarget,
  suggestMacros,
} from "@/lib/utils/tdee";
import { PHASE_TYPES } from "@/lib/registry/phase-types";
import type { ActivityLevel, PhaseType, SexAtBirth } from "@/types/database";
import type { CreatePhaseInput } from "@/lib/validations/phases";

export interface FirstPhaseValue {
  /** undefined = user has chosen to skip; otherwise the phase to create */
  phase: CreatePhaseInput | null;
}

interface Props {
  value: FirstPhaseValue;
  onChange: (next: FirstPhaseValue) => void;
  /** Pulled from earlier steps to compute the suggested target */
  context: {
    sex: SexAtBirth | null;
    dob: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    activity: ActivityLevel | null;
  };
}

const PHASE_PICKABLE: PhaseType[] = ["cut", "bulk", "maintenance", "recomp", "general_fitness"];

export function FirstPhaseStep({ value, onChange, context }: Props) {
  const [chosen, setChosen] = useState<PhaseType | null>(value.phase?.phase_type ?? null);
  const [name, setName] = useState(value.phase?.name ?? "");

  // Suggested calorie target requires every input. If anything is missing we
  // surface "we need more info" rather than guessing.
  const suggestion = useMemo(() => {
    if (!chosen) return null;
    if (
      !context.sex ||
      !context.dob ||
      context.height_cm == null ||
      context.weight_kg == null ||
      !context.activity
    ) {
      return null;
    }
    const age = ageFromDOB(context.dob);
    if (age == null) return null;
    const bmr = calcBMR({
      weight_kg: context.weight_kg,
      height_cm: context.height_cm,
      age,
      sex: context.sex,
    });
    if (bmr == null) return null;
    const tdee = calcTDEE(bmr, context.activity);
    const calories = suggestCalorieTarget(tdee, chosen);
    const macros = suggestMacros(calories, context.weight_kg, chosen);
    return { calories, ...macros };
  }, [chosen, context]);

  function selectType(type: PhaseType) {
    setChosen(type);
    const meta = PHASE_TYPES.find((p) => p.type === type)!;
    const defaultName = `${meta.label} — ${new Date().toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    })}`;
    const start = new Date().toISOString().slice(0, 10);

    const initial: CreatePhaseInput = {
      name: name || defaultName,
      phase_type: type,
      start_date: start,
      planned_end_date: null,
      status: "active",
      notes: null,
      // Targets pre-filled when the suggestion is available
      daily_calorie_target: null,
      daily_protein_target_g: null,
      daily_carbs_target_g: null,
      daily_fat_target_g: null,
      daily_sugar_target_g: null,
      daily_water_target_ml: null,
      weekly_workout_target: null,
      weekly_workout_hours_target: null,
      target_weight_kg: null,
      target_weight_change_kg_per_week: meta.suggestedWeightChange,
    };
    if (!name) setName(defaultName);
    onChange({ phase: initial });
  }

  function applySuggestion() {
    if (!suggestion || !value.phase) return;
    onChange({
      phase: {
        ...value.phase,
        daily_calorie_target: suggestion.calories,
        daily_protein_target_g: suggestion.protein_g,
        daily_carbs_target_g: suggestion.carbs_g,
        daily_fat_target_g: suggestion.fat_g,
      },
    });
  }

  function skipPhase() {
    setChosen(null);
    onChange({ phase: null });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
          Want to start a phase?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          A phase is a focused training/nutrition block — like a 12-week cut or a strength block.
          Totally optional. You can always create one later, or just use the app as a general
          fitness companion.
        </p>
      </header>

      {/* Phase type chooser */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PHASE_PICKABLE.map((type) => {
          const meta = PHASE_TYPES.find((p) => p.type === type)!;
          const selected = chosen === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => selectType(type)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all",
                selected
                  ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30"
                  : "border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700",
              )}
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {meta.label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{meta.description}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={skipPhase}
          aria-pressed={chosen === null}
          className={cn(
            "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all",
            chosen === null
              ? "border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-800"
              : "border-dashed border-gray-300 bg-white hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900",
          )}
        >
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Skip for now
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Companion mode — no targets
          </span>
        </button>
      </div>

      {chosen && value.phase && (
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <Input
            label="Phase name"
            placeholder={`${PHASE_TYPES.find((p) => p.type === chosen)?.label} – Spring 2026`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (value.phase) {
                onChange({ phase: { ...value.phase, name: e.target.value } });
              }
            }}
          />

          {suggestion ? (
            <div className="flex flex-col gap-3 rounded-lg bg-indigo-50/60 p-3 dark:bg-indigo-950/30">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                    Suggested daily target
                  </p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    Based on Mifflin-St Jeor + your activity level. You can edit any of these any
                    time.
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-4 gap-2 text-center text-xs">
                <Stat label="kcal" value={suggestion.calories} />
                <Stat label="protein" value={`${suggestion.protein_g}g`} />
                <Stat label="carbs" value={`${suggestion.carbs_g}g`} />
                <Stat label="fat" value={`${suggestion.fat_g}g`} />
              </dl>
              <button
                type="button"
                onClick={applySuggestion}
                className="self-start rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Use suggested targets
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <Target className="h-3.5 w-3.5" />
              Add height, weight, DOB, sex, and activity level on the previous step to get a
              personalised calorie suggestion. You can always set targets manually later.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-white px-2 py-1.5 dark:bg-gray-900">
      <span className="text-base font-bold text-gray-900 dark:text-gray-100">{value}</span>
      <span className="text-[10px] tracking-wider text-gray-500 uppercase dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}
