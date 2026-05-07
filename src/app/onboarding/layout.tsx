/**
 * Onboarding layout — minimal shell, no dashboard chrome.
 *
 * Auth check is handled inside the page component (not here) because the
 * proxy.ts middleware already gates `/onboarding` on session presence.
 * This layout exists only to scope global CSS and remove the sidebar/nav
 * that would otherwise wrap every authenticated route.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-gray-950 dark:to-gray-950">
      {children}
    </div>
  );
}
