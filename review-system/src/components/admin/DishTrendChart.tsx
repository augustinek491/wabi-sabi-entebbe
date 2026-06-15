"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDay } from "@/lib/admin/format";
import type { AdminTrendPointForDish } from "@/lib/admin/types";

export interface DishTrendChartProps {
  data: AdminTrendPointForDish[];
}

// Mirrors globals.css tokens (PLAN §7.1) — see TrendChart.tsx for the
// literal-hex rationale.
const BRASS_500 = "#B98A3C";
const BRASS_300 = "#D8B978";
const SURFACE_SUNKEN = "#E9E3D0";
const INK_SUBTLE = "#7C7666";
const BORDER = "#C9BFA6";

/**
 * DishTrendChart — per-dish average-rating trend over time (PLAN §2.3 dish
 * detail "Trend over time (line)"). Same visual language as `TrendChart`
 * (overall visit trend), scoped to a single dish's `avgRating` per day.
 */
export function DishTrendChart({ data }: DishTrendChartProps) {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="ws-dish-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRASS_300} stopOpacity={0.28} />
            <stop offset="100%" stopColor={BRASS_300} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={BORDER} strokeOpacity={0.5} vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={formatChartDay}
          tick={{ fill: INK_SUBTLE, fontSize: 12, fontFamily: "var(--font-sans)" }}
          axisLine={{ stroke: BORDER }}
          tickLine={false}
        />
        <YAxis
          yAxisId="rating"
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fill: INK_SUBTLE, fontSize: 12, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <YAxis yAxisId="volume" orientation="right" hide />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
          }}
          labelFormatter={(label) => formatChartDay(String(label))}
          formatter={(value: number, name: string) =>
            name === "avgRating" ? [value?.toFixed?.(2) ?? value, "Avg rating"] : [value, "Ratings"]
          }
        />
        <Bar
          yAxisId="volume"
          dataKey="reviewCount"
          fill={SURFACE_SUNKEN}
          radius={[2, 2, 0, 0]}
          isAnimationActive={!prefersReducedMotion}
        />
        <Area
          yAxisId="rating"
          type="monotone"
          dataKey="avgRating"
          stroke="none"
          fill="url(#ws-dish-trend-fill)"
          isAnimationActive={!prefersReducedMotion}
        />
        <Line
          yAxisId="rating"
          type="monotone"
          dataKey="avgRating"
          stroke={BRASS_500}
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={!prefersReducedMotion}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
