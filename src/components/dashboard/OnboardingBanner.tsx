"use client";

import { useEffect, useState } from "react";
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
 *   - Hide if the user has dismissed it for the current browser tab
 *     (sessionStorage — the prompt returns when the tab is closed and
 *     reopened, even with the same login session)
 *
 * Hydration note: we initialise `dismissed=false` and read sessionStorage
 * inside a useEffect AFTER mount. Reading sessionStorage synchronously in a
 * useState initialiser would diverge between SSR (no `window`, returns false)
 * and the first client render (returns the persisted value), causing a
 * hydration mismatch warning + a re-render flicker.
 *
 * No middleware redirect — by design. The user can use the app immediately;
 * this banner reminds them they can fill in preferences for a richer experience.
 */
export function OnboardingBanner() {
  const { data: settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  // Read sessionStorage AFTER mount so server (no `window`) and client first
  // render produce the same JSX (banner visible). We only update to `true`
  // on the client, post-hydration. The "setState-in-effect" rule complains
  // about cascading renders, but for one-shot browser-API reads on mount
  // this is the canonical pattern — useSyncExternalStore would require a
  // store that emits change events, which sessionStorage doesn't (within
  // the same tab) without a custom emitter.
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount sync, see comment above
      setDismissed(true);
    }
  }, []);

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
