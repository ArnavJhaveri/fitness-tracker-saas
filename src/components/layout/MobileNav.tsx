"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Utensils, Moon, Droplets, MoreHorizontal, Activity } from "lucide-react";
import type { Route } from "next";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/constants";

/**
 * Bottom tab bar shown on mobile (< lg screens).
 * Only shows the 5 most-used sections; extras are reachable via "More".
 */
const MOBILE_NAV = [
  { href: ROUTES.DASHBOARD, label: "Home", icon: Activity, exact: true },
  { href: ROUTES.WORKOUTS, label: "Workout", icon: Dumbbell },
  { href: ROUTES.NUTRITION, label: "Nutrition", icon: Utensils },
  { href: ROUTES.SLEEP, label: "Sleep", icon: Moon },
  { href: ROUTES.WATER, label: "Water", icon: Droplets },
  { href: ROUTES.GOALS, label: "More", icon: MoreHorizontal },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pb-safe fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-white lg:hidden dark:border-gray-700 dark:bg-gray-900"
      aria-label="Mobile navigation"
    >
      <ul className="flex h-16 items-center justify-around">
        {MOBILE_NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const exact = "exact" in item ? item.exact : false;
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href as Route}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
