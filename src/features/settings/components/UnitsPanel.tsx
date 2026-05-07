"use client";

/**
 * Units panel — what unit system to display weights, heights, distances
 * and water in. Pure cosmetic: changing units never rewrites stored
 * values, only how they're rendered.
 */
import { Select } from "@/components/ui/Select";
import type { UserSettings } from "@/types/database";
import { Field, Row, Section } from "./form-primitives";
import {
  DISTANCE_UNIT_OPTS,
  HEIGHT_UNIT_OPTS,
  WATER_UNIT_OPTS,
  WEIGHT_UNIT_OPTS,
} from "../constants";

interface Props {
  draft: Partial<UserSettings>;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function UnitsPanel({ draft, set }: Props) {
  return (
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
            onChange={(e) => set("distance_unit", e.target.value as UserSettings["distance_unit"])}
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
  );
}
