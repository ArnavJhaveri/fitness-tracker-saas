"use client";

import { Select } from "@/components/ui/Select";

export interface DefaultsValue {
  week_starts_on: 0 | 1; // 0 = Sun, 1 = Mon (most common; we expose only these two)
  timezone: string;
  notifications_enabled: boolean;
}

interface Props {
  value: DefaultsValue;
  onChange: (next: DefaultsValue) => void;
}

const WEEK_START_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "0", label: "Sunday" },
];

/** Common IANA zones as a fallback. The browser's resolved zone is the
 *  default, but users can pick something else if they're travelling or
 *  share devices across regions. */
const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Athens",
  "Europe/Istanbul",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function DefaultsStep({ value, onChange }: Props) {
  // Build the timezone list with the user's resolved zone first so it's
  // always selectable even if it's not in the common list.
  const tzOptions = (() => {
    const set = new Set([value.timezone, ...COMMON_TIMEZONES]);
    return Array.from(set).map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }));
  })();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
          A few defaults
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We&apos;ve pre-filled these — adjust if anything looks off.
        </p>
      </header>

      <Select
        label="Week starts on"
        options={WEEK_START_OPTIONS}
        value={String(value.week_starts_on)}
        onChange={(e) => onChange({ ...value, week_starts_on: Number(e.target.value) as 0 | 1 })}
      />

      <Select
        label="Timezone"
        options={tzOptions}
        value={value.timezone}
        onChange={(e) => onChange({ ...value, timezone: e.target.value })}
      />

      <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-indigo-300 dark:border-gray-700 dark:hover:border-indigo-700">
        <input
          type="checkbox"
          checked={value.notifications_enabled}
          onChange={(e) => onChange({ ...value, notifications_enabled: e.target.checked })}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Enable notifications (later)
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            We&apos;ll ask for permission when push notifications launch — this just opts you in to
            be invited.
          </span>
        </div>
      </label>
    </div>
  );
}
