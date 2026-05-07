"use client";

import { Activity, Dumbbell, Heart, Moon, Sparkles, TrendingDown, Utensils } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PrimaryIntent } from "@/types/database";

interface Props {
  value: PrimaryIntent[];
  onChange: (next: PrimaryIntent[]) => void;
}

const INTENT_OPTIONS: {
  intent: PrimaryIntent;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    intent: "track_workouts",
    label: "Track workouts",
    description: "Log lifts, runs, classes, sport sessions",
    icon: Dumbbell,
  },
  {
    intent: "track_nutrition",
    label: "Track nutrition",
    description: "Log meals, calories, macros",
    icon: Utensils,
  },
  {
    intent: "lose_weight",
    label: "Lose weight",
    description: "Sustained calorie deficit",
    icon: TrendingDown,
  },
  {
    intent: "gain_muscle",
    label: "Gain muscle",
    description: "Lean bulk + progressive overload",
    icon: Activity,
  },
  {
    intent: "improve_endurance",
    label: "Improve endurance",
    description: "Run further, cycle longer",
    icon: Heart,
  },
  {
    intent: "improve_sleep",
    label: "Improve sleep",
    description: "Build a better sleep routine",
    icon: Moon,
  },
  {
    intent: "general_fitness",
    label: "Just stay active",
    description: "No specific goal — log when I feel like it",
    icon: Sparkles,
  },
];

export function WelcomeStep({ value, onChange }: Props) {
  function toggle(intent: PrimaryIntent) {
    onChange(value.includes(intent) ? value.filter((v) => v !== intent) : [...value, intent]);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-100">
          Welcome to FitTrack
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400">
          What do you want to use this for? Pick anything that applies — you can change this later
          from settings.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INTENT_OPTIONS.map(({ intent, label, description, icon: Icon }) => {
          const selected = value.includes(intent);
          return (
            <button
              key={intent}
              type="button"
              onClick={() => toggle(intent)}
              aria-pressed={selected}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 bg-white p-4 text-left transition-all",
                "hover:border-indigo-300 hover:bg-indigo-50/50",
                "dark:bg-gray-900 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20",
                selected
                  ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900/40"
                  : "border-gray-200 dark:border-gray-700",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  selected
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
