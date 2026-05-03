"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  value: number | null;
}

interface Props {
  data: DataPoint[];
  color?: string;
  label?: string;
  unit?: string;
  height?: number;
}

export function TrendLineChart({
  data,
  color = "#6366f1",
  label = "Value",
  unit = "",
  height = 200,
}: Props) {
  const filtered = data.filter((d) => d.value != null);
  if (!filtered.length)
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Not enough data yet
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "currentColor" }}
          tickLine={false}
          interval="preserveStartEnd"
          className="text-gray-500"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "currentColor" }}
          tickLine={false}
          axisLine={false}
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
          formatter={(v) => [`${v as number}${unit}`, label]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
