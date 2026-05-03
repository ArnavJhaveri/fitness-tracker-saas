import Link from "next/link";
import { Dumbbell, Home } from "lucide-react";
import { ROUTES, APP_NAME } from "@/constants";

/**
 * Root 404 page — shown for any URL that doesn't match a route.
 * Must be a Server Component (no "use client") so Next.js can statically render it.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-4 text-center dark:bg-gray-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
        <Dumbbell className="h-8 w-8 text-white" />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
          404
        </p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Page not found</h1>
        <p className="max-w-sm text-gray-500 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href={ROUTES.DASHBOARD}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Home className="h-4 w-4" />
          Go to {APP_NAME}
        </Link>
        <Link
          href={ROUTES.HOME}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
