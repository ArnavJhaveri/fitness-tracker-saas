"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MacroTotals } from "../utils/macros";

interface Props {
  totals: MacroTotals;
  targets?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
}

export function MacroSummary({ totals, targets }: Props) {
  const calPct = targets?.calories ? (totals.calories / targets.calories) * 100 : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Calorie ring summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(totals.calories)}
            <span className="ml-1 text-sm font-normal text-gray-500">kcal</span>
          </p>
          {targets?.calories && (
            <p className="text-xs text-gray-400">of {targets.calories} target</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Protein", value: totals.protein_g, color: "text-blue-500" },
            { label: "Carbs", value: totals.carbs_g, color: "text-orange-500" },
            { label: "Fat", value: totals.fat_g, color: "text-violet-500" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-base font-semibold ${color}`}>{Math.round(value)}g</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bars */}
      <div className="flex flex-col gap-2">
        {calPct !== null && (
          <ProgressBar
            value={calPct}
            label="Calories"
            color={calPct > 110 ? "red" : "indigo"}
            showPercent
          />
        )}
        {targets?.protein_g && (
          <ProgressBar
            value={(totals.protein_g / targets.protein_g) * 100}
            label="Protein"
            color="blue"
            showPercent
          />
        )}
      </div>
    </div>
  );
}
