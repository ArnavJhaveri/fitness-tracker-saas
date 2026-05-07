"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PHASE_TYPES } from "@/lib/registry/phase-types";
import { localDateStr } from "@/lib/utils/date";
import type { CreatePhaseInput } from "@/lib/validations/phases";
import type { PhaseType } from "@/types/database";

const PHASE_TYPE_OPTIONS = PHASE_TYPES.map((p) => ({
  value: p.type,
  label: `${p.label} — ${p.description}`,
}));

interface Props {
  /** Pre-fill values, used in pivot mode. */
  initial?: Partial<CreatePhaseInput>;
  /** Submit handler — receives the validated payload. The parent decides
   *  whether to call create vs pivot. Returning a promise lets us show a
   *  spinner until the network call resolves. */
  onSubmit: (payload: CreatePhaseInput) => Promise<void>;
  onCancel?: () => void;
  /** Visible CTA on the submit button. Defaults to "Create phase". */
  submitLabel?: string;
}

/**
 * Shared form for creating a phase OR composing the new phase that goes
 * into a pivot. The pivot endpoint expects exactly the same payload shape
 * as createPhaseSchema, so reusing the form keeps both flows in lock-step.
 *
 * Macro/calorie targets are omitted from this v1 form — they're set via
 * the in-place edit on the phase detail page or seeded by the onboarding
 * wizard's TDEE suggestion. Adding them here would clutter the modal and
 * duplicate logic that already lives in onboarding.
 */
export function PhaseForm({ initial, onSubmit, onCancel, submitLabel = "Create phase" }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<PhaseType>((initial?.phase_type as PhaseType) ?? "cut");
  const [startDate, setStartDate] = useState(initial?.start_date ?? localDateStr());
  const [endDate, setEndDate] = useState(initial?.planned_end_date ?? "");
  const [targetWeight, setTargetWeight] = useState(
    initial?.target_weight_kg != null ? String(initial.target_weight_kg) : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (!name.trim()) {
      setErr("Give the phase a name so you can find it later.");
      return;
    }
    if (endDate && endDate < startDate) {
      setErr("End date must be on or after the start date.");
      return;
    }

    const payload: CreatePhaseInput = {
      name: name.trim(),
      phase_type: type,
      start_date: startDate,
      planned_end_date: endDate || null,
      status: "active",
      notes: notes.trim() || null,
      // Numeric targets stay null in this form — fed in via onboarding/edit.
      daily_calorie_target: initial?.daily_calorie_target ?? null,
      daily_protein_target_g: initial?.daily_protein_target_g ?? null,
      daily_carbs_target_g: initial?.daily_carbs_target_g ?? null,
      daily_fat_target_g: initial?.daily_fat_target_g ?? null,
      daily_sugar_target_g: initial?.daily_sugar_target_g ?? null,
      daily_water_target_ml: initial?.daily_water_target_ml ?? null,
      weekly_workout_target: initial?.weekly_workout_target ?? null,
      weekly_workout_hours_target: initial?.weekly_workout_hours_target ?? null,
      target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
      target_weight_change_kg_per_week:
        // Default the weekly delta from the phase type when we know it.
        // Users can override later via the phase detail page.
        PHASE_TYPES.find((p) => p.type === type)?.suggestedWeightChange ?? null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save. Please try again.");
      setSubmitting(false);
    }
    // Don't reset submitting on success — the parent will unmount us.
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {err && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
        >
          {err}
        </p>
      )}

      <Input
        label="Phase name"
        placeholder="e.g. Spring Cut 2026"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={200}
      />

      <Select
        label="Type"
        options={PHASE_TYPE_OPTIONS}
        value={type}
        onChange={(e) => setType(e.target.value as PhaseType)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
        <Input
          label="End date (optional)"
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <Input
        label="Target weight (kg, optional)"
        type="number"
        step="0.1"
        placeholder="e.g. 70"
        value={targetWeight}
        onChange={(e) => setTargetWeight(e.target.value)}
        min={20}
        max={400}
      />

      <Textarea
        label="Notes (optional)"
        placeholder="Anything you want to remember about this phase."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        maxLength={4000}
      />

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
