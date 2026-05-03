"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Root error boundary — catches unhandled errors outside the (dashboard) group
 * (e.g. in auth pages or the landing page). Next.js requires this to be a
 * Client Component with exactly this props signature.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html>
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center dark:bg-gray-950">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Something went wrong
            </h1>
            <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
              An unexpected error occurred. Please refresh and try again.
              {error.digest && (
                <span className="mt-1 block font-mono text-xs text-gray-400">
                  ID: {error.digest}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
