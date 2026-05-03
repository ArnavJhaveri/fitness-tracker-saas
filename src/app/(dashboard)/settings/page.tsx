"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSettings, useUpdateSettings } from "@/features/settings/hooks/useSettings";
import type { UserSettings } from "@/types/database";

// ─── Option lists ──────────────────────────────────────────────────────────────

const WEIGHT_UNIT_OPTS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lbs", label: "Pounds (lbs)" },
];
const HEIGHT_UNIT_OPTS = [
  { value: "cm", label: "Centimetres (cm)" },
  { value: "ft", label: "Feet & inches (ft)" },
];
const DISTANCE_UNIT_OPTS = [
  { value: "km", label: "Kilometres (km)" },
  { value: "miles", label: "Miles" },
];
const WATER_UNIT_OPTS = [
  { value: "ml", label: "Millilitres (ml)" },
  { value: "oz", label: "Fluid ounces (oz)" },
];
const THEME_OPTS = [
  { value: "system", label: "System default" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const WEEK_START_OPTS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "6", label: "Saturday" },
];

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
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

function NumberField({
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

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

function Row({ children }: { children: React.ReactNode }) {
  return <div className="py-4 first:pt-0 last:pb-0">{children}</div>;
}

// ─── Inner form — receives already-loaded settings so state init is synchronous ─

/**
 * Separated from the page shell so that `useState` can be initialised directly
 * from `initial` rather than using a `useEffect` to sync state after an async
 * load. This avoids the react-hooks/set-state-in-effect lint violation and the
 * double-render it would cause.
 */
function SettingsForm({ initial }: { initial: UserSettings }) {
  const { mutate: save, isPending, isSuccess } = useUpdateSettings();

  // Local draft — only flushed to the server when the user clicks Save
  const [draft, setDraft] = useState<Partial<UserSettings>>(initial);

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    // Strip non-payload identity fields before sending
    const { user_id, created_at, updated_at, ...payload } = draft as UserSettings;
    void user_id;
    void created_at;
    void updated_at;
    save(payload);
  }

  return (
    <div className="flex flex-col">
      <Header title="Settings" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Units */}
        <Section title="Units">
          <Row>
            <Field label="Weight" hint="Used for body weight and exercises">
              <Select
                options={WEIGHT_UNIT_OPTS}
                value={draft.weight_unit ?? "kg"}
                onChange={(e) => set("weight_unit", e.target.value as UserSettings["weight_unit"])}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Height">
              <Select
                options={HEIGHT_UNIT_OPTS}
                value={draft.height_unit ?? "cm"}
                onChange={(e) => set("height_unit", e.target.value as UserSettings["height_unit"])}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Distance" hint="Used for cardio exercises">
              <Select
                options={DISTANCE_UNIT_OPTS}
                value={draft.distance_unit ?? "km"}
                onChange={(e) =>
                  set("distance_unit", e.target.value as UserSettings["distance_unit"])
                }
              />
            </Field>
          </Row>
          <Row>
            <Field label="Water">
              <Select
                options={WATER_UNIT_OPTS}
                value={draft.water_unit ?? "ml"}
                onChange={(e) => set("water_unit", e.target.value as UserSettings["water_unit"])}
              />
            </Field>
          </Row>
        </Section>

        {/* Daily targets */}
        <Section title="Daily targets">
          <Row>
            <NumberField
              label="Calories"
              hint="Leave blank to disable"
              value={draft.daily_calorie_target ?? null}
              onChange={(v) => set("daily_calorie_target", v)}
              min={500}
              max={10000}
              unit="kcal"
            />
          </Row>
          <Row>
            <NumberField
              label="Protein"
              hint="Leave blank to disable"
              value={draft.daily_protein_target_g ?? null}
              onChange={(v) => set("daily_protein_target_g", v)}
              min={0}
              max={500}
              unit="g"
            />
          </Row>
          <Row>
            <NumberField
              label="Water"
              value={draft.daily_water_target_ml ?? 2000}
              onChange={(v) => set("daily_water_target_ml", v ?? 2000)}
              min={500}
              max={10000}
              unit="ml"
            />
          </Row>
          <Row>
            <NumberField
              label="Sleep"
              value={
                draft.sleep_target_minutes != null
                  ? Math.round((draft.sleep_target_minutes / 60) * 10) / 10
                  : 8
              }
              onChange={(v) => set("sleep_target_minutes", v != null ? Math.round(v * 60) : 480)}
              min={1}
              max={24}
              step={0.5}
              unit="hrs"
            />
          </Row>
          <Row>
            <NumberField
              label="Rest between sets"
              hint="Default rest timer for workouts"
              value={draft.default_rest_seconds ?? null}
              onChange={(v) => set("default_rest_seconds", v)}
              min={0}
              max={600}
              unit="sec"
            />
          </Row>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <Row>
            <Field label="Theme">
              <Select
                options={THEME_OPTS}
                value={draft.theme ?? "system"}
                onChange={(e) => set("theme", e.target.value as UserSettings["theme"])}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Week starts on">
              <Select
                options={WEEK_START_OPTS}
                value={String(draft.week_starts_on ?? 1)}
                onChange={(e) =>
                  set("week_starts_on", Number(e.target.value) as UserSettings["week_starts_on"])
                }
              />
            </Field>
          </Row>
          <Row>
            <Field label="Timezone" hint="Used for daily summaries">
              <input
                type="text"
                value={draft.timezone ?? "UTC"}
                onChange={(e) => set("timezone", e.target.value)}
                placeholder="e.g. Europe/London"
                className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Notifications">
              <label className="flex cursor-pointer items-center gap-2.5">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={draft.notifications_enabled ?? false}
                    onChange={(e) => set("notifications_enabled", e.target.checked)}
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-indigo-600 dark:bg-gray-700" />
                  <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {draft.notifications_enabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </Field>
          </Row>
        </Section>

        {/* Save bar */}
        <div className="flex items-center justify-end gap-3">
          {isSuccess && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={isPending} className="min-w-[100px]">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page shell — handles loading state then renders the form ─────────────────

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col">
        <Header title="Settings" />
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Key on user_id so the form reinitialises cleanly if the session changes
  return <SettingsForm key={settings.user_id} initial={settings} />;
}
