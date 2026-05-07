"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import type { Route } from "next";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { ROUTES } from "@/constants";

const SESSION_DISMISS_KEY = "onboarding-banner-dismissed";

/**
 * Persistent (but session-dismissible) prompt to finish onboarding.
 *
 * Visibility logic:
 *   - Show if user_settings.onboarded_at IS NULL
 *   - Hide if the user has dismissed it for the current browser session
 *     (sessionStorage — the prompt returns next time they sign in)
 *
 * No middleware redirect — by design. The user can use the app immediately;
 * this banner reminds them they can fill in preferences for a richer experience.
 */
export function OnboardingBanner() {
  const { data: settings } = useSettings();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
  });

  // The hook returns undefined until the first fetch resolves; while loading
  // we render nothing rather than briefly flashing the banner.
  if (!settings) return null;
  if (settings.onboarded_at) return null;
  if (dismissed) return null;

  function dismiss() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    }
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Finish onboarding"
      className="border-b border-indigo-200 bg-indigo-50/70 px-4 py-3 sm:px-6 dark:border-indigo-900/40 dark:bg-indigo-950/30"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
              Finish setting up FitTrack
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              Tell us your goals to unlock personalised targets and analytics. Takes about a minute.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={ROUTES.ONBOARDING as Route}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Continue setup
          </Link>
          <button
            onClick={dismiss}
            aria-label="Dismiss onboarding banner for this session"
            className="rounded-lg p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
