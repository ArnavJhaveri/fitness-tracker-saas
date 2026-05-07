"use client";

/**
 * Settings page — orchestration only.
 *
 * The form is split into three panels (Units, Targets, Preferences) that
 * each take a `(draft, set)` pair. Keeping draft state here means the
 * Save button has a single source of truth, and individual panels stay
 * presentational + independently testable.
 */
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSettings, useUpdateSettings } from "@/features/settings/hooks/useSettings";
import { UnitsPanel } from "@/features/settings/components/UnitsPanel";
import { TargetsPanel } from "@/features/settings/components/TargetsPanel";
import { PreferencesPanel } from "@/features/settings/components/PreferencesPanel";
import type { UserSettings } from "@/types/database";

/**
 * Inner form, separated from the page shell so `useState` can initialise
 * synchronously from `initial` rather than syncing in a useEffect after
 * an async load. That avoids the react-hooks/set-state-in-effect violation
 * and the double-render it would cause.
 */
function SettingsForm({ initial }: { initial: UserSettings }) {
  const { mutate: save, isPending, isSuccess } = useUpdateSettings();

  // Local draft — only flushed to the server when the user clicks Save.
  const [draft, setDraft] = useState<Partial<UserSettings>>(initial);

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    // Strip non-payload identity fields before sending.
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
        <UnitsPanel draft={draft} set={set} />
        <TargetsPanel draft={draft} set={set} />
        <PreferencesPanel draft={draft} set={set} />

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

  // Key on user_id so the form reinitialises cleanly if the session changes.
  return <SettingsForm key={settings.user_id} initial={settings} />;
}
