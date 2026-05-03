"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DailySummary } from "@/types/database";

interface Props {
  summaries: DailySummary[];
  height?: number;
}

export function WeeklyBarChart({ summaries, height = 160 }: Props) {
  // Last 7 days
  const days = [...summaries]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .slice(-7)
    .map((d) => ({
      // Use noon UTC so the date is unambiguous in all timezones (±14h offset)
      day: new Date(d.log_date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short" }),
      workouts: d.workout_count,
    }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={days} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="opacity-10"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          className="text-gray-500"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          className="text-gray-500"
        />
        <Tooltip
          contentStyle={{
            background: "#1f2937",
            border: "none",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#f9fafb",
          }}
          formatter={(v) => [v as number, "Workouts"]}
        />
        <Bar dataKey="workouts" radius={[4, 4, 0, 0]}>
          {days.map((d, i) => (
            <Cell
              key={i}
              fill={d.workouts > 0 ? "#6366f1" : "#e5e7eb"}
              className={d.workouts === 0 ? "dark:fill-gray-700" : ""}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
