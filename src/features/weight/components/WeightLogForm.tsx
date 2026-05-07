"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useLogWeight } from "../hooks/useWeight";

interface Props {
  onSuccess?: () => void;
}

export function WeightLogForm({ onSuccess }: Props) {
  const [kg, setKg] = useState("");
  const [bf, setBf] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const { mutate, isPending } = useLogWeight();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const weight_kg = parseFloat(kg);
    if (isNaN(weight_kg) || weight_kg <= 0 || weight_kg > 500) {
      setErr("Enter a valid weight (0–500 kg)");
      return;
    }
    const bfParsed = bf ? parseFloat(bf) : null;
    if (bfParsed !== null && (bfParsed < 0 || bfParsed > 70)) {
      setErr("Body fat must be between 0–70%");
      return;
    }
    mutate(
      {
        weight_kg,
        body_fat_percentage: bfParsed,
        logged_at: new Date().toISOString(),
        notes: notes || null,
      },
      {
        onSuccess: () => {
          setKg("");
          setBf("");
          setNotes("");
          onSuccess?.();
        },
        onError: (e) => setErr(e.message || "Failed to save. Please try again."),
      },
    );
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

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Weight (kg)"
          type="number"
          step="0.1"
          placeholder="70.5"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          required
        />
        <Input
          label="Body fat %"
          type="number"
          step="0.1"
          placeholder="Optional"
          value={bf}
          onChange={(e) => setBf(e.target.value)}
        />
      </div>

      <Textarea
        label="Notes"
        placeholder="Any context (morning, after workout…)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />

      <Button type="submit" isLoading={isPending} className="w-full">
        Log weight
      </Button>
    </form>
  );
}
