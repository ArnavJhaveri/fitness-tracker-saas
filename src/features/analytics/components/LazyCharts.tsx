/**
 * Lazy-loaded chart wrappers.
 *
 * Recharts is ~180 kB gzipped. Importing it statically would include it in
 * the initial JS bundle, increasing the Time-to-Interactive on every page —
 * even pages with no charts. Dynamic imports defer loading until the component
 * is actually needed, keeping the main bundle lean.
 *
 * Usage:
 *   import { LazyTrendLineChart, LazyWeeklyBarChart } from "./LazyCharts";
 *
 * The `loading` prop renders a skeleton while the chart code downloads.
 * This prevents layout shift (CLS).
 */
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

export const LazyTrendLineChart = dynamic(
  () => import("./TrendLineChart").then((m) => ({ default: m.TrendLineChart })),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-xl" />,
    ssr: false, // Charts use browser APIs (ResizeObserver) — server render is not useful
  },
);

export const LazyWeeklyBarChart = dynamic(
  () => import("./WeeklyBarChart").then((m) => ({ default: m.WeeklyBarChart })),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-xl" />,
    ssr: false,
  },
);
