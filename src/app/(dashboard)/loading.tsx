/**
 * Dashboard shell loading state — shown by Next.js while the dashboard layout
 * is streaming or a page segment is suspending during navigation.
 *
 * Mirrors the real layout (header + content area) so there's no layout shift
 * once the real content arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col">
      {/* Header skeleton */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4 sm:px-6 dark:border-gray-700">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-2 h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-7 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />

        {/* Secondary card */}
        <div className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
