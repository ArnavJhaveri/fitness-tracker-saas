"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogWater } from "../hooks/useWater";

const QUICK_AMOUNTS = [150, 250, 330, 500, 750];

export function WaterLogger() {
  const [custom, setCustom] = useState("");
  const [err, setErr] = useState("");
  const { mutate, isPending } = useLogWater();

  function log(ml: number) {
    if (ml <= 0) return;
    setErr("");
    mutate(ml, {
      // Only clear the input after the server confirms success so the value
      // isn't lost if the request fails and the user needs to retry.
      onSuccess: () => setCustom(""),
      onError: (e) => setErr(e.message || "Failed to log water. Please try again."),
    });
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ml = parseInt(custom, 10);
    if (!isNaN(ml) && ml > 0 && ml <= 5000) log(ml);
  }

  return (
    <div className="flex flex-col gap-4">
      {err && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
        >
          {err}
        </p>
      )}
      {/* Quick-add buttons — py-3 ensures ≥44px touch targets on mobile */}
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            onClick={() => log(ml)}
            disabled={isPending}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40"
          >
            +{ml} ml
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <Input
          type="number"
          placeholder="Custom amount (ml)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          min={1}
          max={5000}
          className="flex-1"
        />
        <Button type="submit" size="md" disabled={!custom || isPending}>
          <Plus className="h-4 w-4" />
          Log
        </Button>
      </form>
    </div>
  );
}
