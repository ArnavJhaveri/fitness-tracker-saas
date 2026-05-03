"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Dashboard error boundary — catches unhandled errors in any (dashboard) route segment.
 * Next.js requires this to be a Client Component with the exact props signature below.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error reporting service here (Sentry, etc.)
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Something went wrong</h2>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          An unexpected error occurred. Your data is safe — try refreshing the page.
          {error.digest && (
            <span className="mt-1 block font-mono text-xs text-gray-400">
              Error ID: {error.digest}
            </span>
          )}
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={reset} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="ghost" onClick={() => window.location.assign("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
