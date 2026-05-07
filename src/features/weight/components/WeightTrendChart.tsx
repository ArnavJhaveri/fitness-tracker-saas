"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { WeightEntry } from "@/types/database";

interface Props {
  entries: WeightEntry[];
}

export function WeightTrendChart({ entries }: Props) {
  const sorted = [...entries].sort((a, b) => a.logged_at.localeCompare(b.logged_at)).slice(-60); // last 60 entries

  // Defend against an empty array — Math.min/max([]) returns +Infinity/-Infinity
  // which propagate into the chart's domain and crash Recharts. Parents
  // currently guard against this at the call site, but the component itself
  // shouldn't trust the caller.
  if (sorted.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        Not enough data yet
      </div>
    );
  }

  const data = sorted.map((e) => ({
    date: new Date(e.logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    kg: e.weight_kg,
  }));

  const weights = sorted.map((e) => e.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  const padding = Math.max(1, (max - min) * 0.3);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          interval="preserveStartEnd"
          className="text-gray-500 dark:text-gray-400"
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
          className="text-gray-500 dark:text-gray-400"
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-gray-800, #1f2937)",
            border: "none",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#f9fafb",
          }}
          formatter={(v) => [`${v as number} kg`, "Weight"]}
        />
        <ReferenceLine y={avg} stroke="#6366f1" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="kg"
          stroke="#6366f1"
          strokeWidth={2}
          dot={data.length <= 20 ? { r: 3, fill: "#6366f1" } : false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
