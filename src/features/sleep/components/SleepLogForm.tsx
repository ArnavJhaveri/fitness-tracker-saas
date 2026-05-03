"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useLogSleep } from "../hooks/useSleep";
import { localDateStr } from "@/lib/utils/date";

const QUALITY_OPTIONS = [
  { value: "", label: "No rating" },
  { value: "5", label: "⭐⭐⭐⭐⭐ Excellent" },
  { value: "4", label: "⭐⭐⭐⭐ Good" },
  { value: "3", label: "⭐⭐⭐ Fair" },
  { value: "2", label: "⭐⭐ Poor" },
  { value: "1", label: "⭐ Very poor" },
];

interface Props {
  onSuccess?: () => void;
}

export function SleepLogForm({ onSuccess }: Props) {
  // Default: previous night 11 PM → 7 AM.
  // Lazy initialisers run once at mount so Date.now() is only called once,
  // satisfying the react-hooks/purity rule (no impure calls during render).
  const [sleepDate, setSleepDate] = useState(() => localDateStr(new Date(Date.now() - 86_400_000)));
  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeDate, setWakeDate] = useState(() => localDateStr(new Date()));
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const { mutate, isPending } = useLogSleep();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const start = new Date(`${sleepDate}T${sleepTime}:00`);
    const end = new Date(`${wakeDate}T${wakeTime}:00`);

    if (end <= start) {
      setErr("Wake time must be after sleep time");
      return;
    }

    const durationH = (end.getTime() - start.getTime()) / 3_600_000;
    if (durationH > 16) {
      setErr("Sleep duration seems too long (>16 hours)");
      return;
    }

    mutate(
      {
        sleep_start: start.toISOString(),
        sleep_end: end.toISOString(),
        quality: quality ? parseInt(quality) : null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          // Reset all fields to the defaults, not just notes/quality —
          // leaving dates unchanged would allow accidental duplicate submissions.
          setSleepDate(localDateStr(new Date(Date.now() - 86_400_000)));
          setSleepTime("23:00");
          setWakeDate(localDateStr(new Date()));
          setWakeTime("07:00");
          setQuality("");
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
          label="Bedtime date"
          type="date"
          value={sleepDate}
          onChange={(e) => setSleepDate(e.target.value)}
          required
        />
        <Input
          label="Bedtime"
          type="time"
          value={sleepTime}
          onChange={(e) => setSleepTime(e.target.value)}
          required
        />
        <Input
          label="Wake date"
          type="date"
          value={wakeDate}
          onChange={(e) => setWakeDate(e.target.value)}
          required
        />
        <Input
          label="Wake time"
          type="time"
          value={wakeTime}
          onChange={(e) => setWakeTime(e.target.value)}
          required
        />
      </div>

      <Select
        label="Sleep quality"
        value={quality}
        onChange={(e) => setQuality(e.target.value)}
        options={QUALITY_OPTIONS}
      />

      <Textarea
        label="Notes"
        placeholder="Any notes about your sleep…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />

      <Button type="submit" isLoading={isPending} className="w-full">
        Log sleep
      </Button>
    </form>
  );
}
