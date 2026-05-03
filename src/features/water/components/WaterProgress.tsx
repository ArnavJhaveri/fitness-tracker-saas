"use client";

import { Droplets } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface WaterProgressProps {
  totalMl: number;
  targetMl: number;
}

export function WaterProgress({ totalMl, targetMl }: WaterProgressProps) {
  const pct = targetMl > 0 ? Math.min(100, (totalMl / targetMl) * 100) : 0;
  const remaining = Math.max(0, targetMl - totalMl);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {totalMl.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-gray-500">ml</span>
          </span>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          / {targetMl.toLocaleString()} ml
        </span>
      </div>

      <ProgressBar value={pct} color="blue" size="md" />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {pct >= 100 ? "🎉 Daily target reached!" : `${remaining.toLocaleString()} ml remaining`}
      </p>
    </div>
  );
}
