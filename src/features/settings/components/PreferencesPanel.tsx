"use client";

/**
 * Preferences panel — theme, week-start day, IANA timezone, and the
 * notifications toggle. The timezone field is a free-text input rather
 * than a select because the IANA database is huge and a typeahead would
 * be a separate piece of work. The DB falls back to "UTC" if the value
 * is unparseable.
 */
import { Select } from "@/components/ui/Select";
import type { UserSettings } from "@/types/database";
import { Field, Row, Section } from "./form-primitives";
import { THEME_OPTS, WEEK_START_OPTS } from "../constants";

interface Props {
  draft: Partial<UserSettings>;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function PreferencesPanel({ draft, set }: Props) {
  return (
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
  );
}
