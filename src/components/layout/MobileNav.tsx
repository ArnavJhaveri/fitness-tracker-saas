"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  Utensils,
  Moon,
  Droplets,
  MoreHorizontal,
  Activity,
  Scale,
  BarChart2,
  Target,
  Settings,
  X,
} from "lucide-react";
import type { Route } from "next";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/constants";

/**
 * Bottom tab bar shown on mobile (< lg screens).
 *
 * The five primary sections are always visible. Additional pages (Weight,
 * Analytics, Goals, Settings) are reachable via the "More" sheet so all
 * sections have a touch target without overcrowding the bar.
 *
 * z-index convention for this file:
 *   z-40  — nav bar
 *   z-50  — "More" backdrop + drawer (must sit above the bar)
 */
const PRIMARY_NAV = [
  { href: ROUTES.DASHBOARD, label: "Home", icon: Activity, exact: true },
  { href: ROUTES.WORKOUTS, label: "Workout", icon: Dumbbell },
  { href: ROUTES.NUTRITION, label: "Nutrition", icon: Utensils },
  { href: ROUTES.SLEEP, label: "Sleep", icon: Moon },
  { href: ROUTES.WATER, label: "Water", icon: Droplets },
] as const;

const MORE_NAV = [
  { href: ROUTES.WEIGHT, label: "Weight", icon: Scale },
  { href: ROUTES.ANALYTICS, label: "Analytics", icon: BarChart2 },
  { href: ROUTES.GOALS, label: "Goals", icon: Target },
  { href: ROUTES.SETTINGS, label: "Settings", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // True when the current page is one of the "More" items — keeps the button
  // visually active so the user knows which section they are in.
  const moreActive = MORE_NAV.some(({ href }) => pathname.startsWith(href));

  return (
    <>
      {/* ── More drawer ─────────────────────────────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation options"
            className="pb-safe fixed right-0 bottom-16 left-0 z-50 rounded-t-2xl border-t border-gray-200 bg-white p-4 lg:hidden dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="grid grid-cols-4 gap-2">
              {MORE_NAV.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href as Route}
                      onClick={() => setMoreOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* ── Bottom tab bar ───────────────────────────────────────────────────── */}
      <nav
        className="pb-safe fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-white lg:hidden dark:border-gray-700 dark:bg-gray-900"
        aria-label="Mobile navigation"
      >
        <ul className="flex h-16 items-center justify-around">
          {PRIMARY_NAV.map((item) => {
            const { href, label, icon: Icon } = item;
            const exact = "exact" in item ? item.exact : false;
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href as Route}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
                  )}
                >
                  {/* Underline indicator — colour-independent active signal */}
                  <span
                    className={cn(
                      "mb-0.5 h-0.5 w-4 rounded-full transition-colors",
                      isActive ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent",
                    )}
                    aria-hidden="true"
                  />
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            );
          })}

          {/* More button */}
          <li className="flex-1">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-label="More navigation options"
              className={cn(
                "flex w-full flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                moreActive || moreOpen
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
              )}
            >
              <span
                className={cn(
                  "mb-0.5 h-0.5 w-4 rounded-full transition-colors",
                  moreActive || moreOpen ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent",
                )}
                aria-hidden="true"
              />
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
