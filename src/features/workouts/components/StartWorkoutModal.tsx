"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useCreateWorkout } from "../hooks/useWorkouts";

interface Props {
  onSuccess?: (id: string) => void;
}

export function StartWorkoutModal({ onSuccess }: Props) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const { mutate, isPending } = useCreateWorkout();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return;
    mutate(
      { name: name.trim(), notes: notes || null, started_at: new Date().toISOString() },
      {
        onSuccess: (session) => {
          setName("");
          setNotes("");
          onSuccess?.(session.id);
        },
        onError: (e) => setErr(e.message || "Failed to start workout. Please try again."),
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
      <Input
        label="Workout name"
        placeholder="e.g. Push day, Morning run…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Textarea
        label="Notes"
        placeholder="Optional notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <Button type="submit" isLoading={isPending} className="w-full">
        Start workout
      </Button>
    </form>
  );
}
