"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  /** Zero-indexed current step (0..total-1) */
  current: number;
  /** Total step count */
  total: number;
  /** Step labels — shown beneath the dots on wider screens */
  labels?: string[];
}

/**
 * Horizontal progress dots. Step is "complete" if its index < current.
 * Labels collapse to dots-only on narrow screens.
 */
export function StepIndicator({ current, total, labels }: Props) {
  return (
    <ol
      className="flex items-center justify-between gap-1"
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < current;
        const isActive = i === current;
        const label = labels?.[i];
        return (
          <li key={i} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center gap-1">
              {/* Connector to the previous dot — invisible on the first item */}
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors",
                  i === 0
                    ? "bg-transparent"
                    : isDone || isActive
                      ? "bg-indigo-500"
                      : "bg-gray-200 dark:bg-gray-700",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  isDone
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : isActive
                      ? "border-indigo-500 bg-white text-indigo-600 dark:bg-gray-900"
                      : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {/* Connector to the next dot — invisible on the last item */}
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors",
                  i === total - 1
                    ? "bg-transparent"
                    : isDone
                      ? "bg-indigo-500"
                      : "bg-gray-200 dark:bg-gray-700",
                )}
                aria-hidden="true"
              />
            </div>
            {label && (
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  isActive
                    ? "text-gray-900 dark:text-gray-100"
                    : isDone
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400",
                )}
              >
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
