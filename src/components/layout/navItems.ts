/**
 * Shared navigation config consumed by both Sidebar (desktop, lg+) and
 * MobileNav (touch, < lg). Keeping the list in one place prevents the
 * "added a new route, only sidebar updated" drift that the audit caught
 * (the previous mobile nav was missing /exercises and /phases entirely).
 *
 * `primary` items show in the bottom tab bar on mobile (capped at 5);
 * everything else lives in the "More" sheet.
 */
import type { ComponentType } from "react";
import {
  Activity,
  BarChart2,
  Calendar,
  Droplets,
  Dumbbell,
  ListChecks,
  Moon,
  Scale,
  Settings,
  Target,
  Utensils,
} from "lucide-react";
import { ROUTES } from "@/constants";

export interface NavItem {
  href: string;
  label: string;
  /** Different label for the cramped 5-up mobile bar */
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  /** True for the dashboard root — match exact path, not prefix. */
  exact?: boolean;
  /** Bottom-tab on mobile vs "More" sheet. */
  primary: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: ROUTES.DASHBOARD,
    label: "Overview",
    shortLabel: "Home",
    icon: Activity,
    exact: true,
    primary: true,
  },
  {
    href: ROUTES.WORKOUTS,
    label: "Workouts",
    shortLabel: "Workout",
    icon: Dumbbell,
    primary: true,
  },
  { href: ROUTES.NUTRITION, label: "Nutrition", icon: Utensils, primary: true },
  { href: ROUTES.SLEEP, label: "Sleep", icon: Moon, primary: true },
  { href: ROUTES.WATER, label: "Water", icon: Droplets, primary: true },
  { href: ROUTES.EXERCISES, label: "Exercises", icon: ListChecks, primary: false },
  { href: ROUTES.WEIGHT, label: "Weight", icon: Scale, primary: false },
  { href: ROUTES.GOALS, label: "Goals", icon: Target, primary: false },
  { href: ROUTES.PHASES, label: "Phases", icon: Calendar, primary: false },
  { href: ROUTES.ANALYTICS, label: "Analytics", icon: BarChart2, primary: false },
  { href: ROUTES.SETTINGS, label: "Settings", icon: Settings, primary: false },
] as const;
