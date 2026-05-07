/**
 * Static option lists for the settings form selects.
 *
 * Kept separate from the panels so they can be reused (e.g. in the
 * onboarding wizard) without duplicating the labels — the wording shown
 * to the user should be identical wherever the units appear.
 */

export const WEIGHT_UNIT_OPTS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lbs", label: "Pounds (lbs)" },
];

export const HEIGHT_UNIT_OPTS = [
  { value: "cm", label: "Centimetres (cm)" },
  { value: "ft", label: "Feet & inches (ft)" },
];

export const DISTANCE_UNIT_OPTS = [
  { value: "km", label: "Kilometres (km)" },
  { value: "miles", label: "Miles" },
];

export const WATER_UNIT_OPTS = [
  { value: "ml", label: "Millilitres (ml)" },
  { value: "oz", label: "Fluid ounces (oz)" },
];

export const THEME_OPTS = [
  { value: "system", label: "System default" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const WEEK_START_OPTS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "6", label: "Saturday" },
];
