/**
 * Tiny presentational primitives shared by every settings panel.
 *
 * Extracted from the page so each panel imports the same Field / Row /
 * Section / NumberField. This keeps the visual rhythm consistent and
 * means a styling change (label width, divider colour, focus ring) is a
 * one-file edit.
 *
 * None of these own state — they're stateless wrappers that the panels
 * compose. Local input state stays in the parent so the "draft" stays a
 * single source of truth across the form.
 */

import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 shrink-0 sm:w-48">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <div className="w-full sm:max-w-xs">{children}</div>
    </div>
  );
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  hint?: string;
  /** null = empty input. Component does not coerce blanks to 0. */
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        {unit && <span className="shrink-0 text-xs text-gray-400">{unit}</span>}
      </div>
    </Field>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="py-4 first:pt-0 last:pb-0">{children}</div>;
}
