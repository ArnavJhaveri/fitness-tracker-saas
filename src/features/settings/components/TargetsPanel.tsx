"use client";

/**
 * Daily-targets panel — calorie/protein/water/sleep/rest defaults that
 * apply when no active phase overrides them. These are the "companion
 * mode" baseline; an active phase's targets take precedence at render
 * time via `applyResolution(settings, phase)` (see /lib/targets).
 *
 * Sleep is stored as minutes in the DB but presented as hours with
 * half-hour granularity — most users think in hours but can express
 * "7.5h" naturally. Round-trip conversion is symmetric.
 */
import type { UserSettings } from "@/types/database";
import { NumberField, Row, Section } from "./form-primitives";

interface Props {
  draft: Partial<UserSettings>;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function TargetsPanel({ draft, set }: Props) {
  return (
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
          // Water has no "disabled" state — every user benefits from a
          // baseline target. Default to 2000ml (~8 cups) when unset.
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
          // Stored in minutes; surfaced in hours with 0.5h granularity.
          // Round-trip the conversion so 7.5h round-trips through min→hr→min
          // without drift.
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
  );
}
