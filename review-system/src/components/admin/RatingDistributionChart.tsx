"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RatingDistribution } from "@/lib/admin/types";

export interface RatingDistributionChartProps {
  data: RatingDistribution[];
}

// Mirrors globals.css tokens (PLAN §7.1) — see TrendChart.tsx for why these
// are literal hex rather than var(...).
const ACCENT_CLAY = "#B07A56"; // bars 1-2
const ACCENT_MATCHA = "#7C8366"; // bars 3-5
const INK_SUBTLE = "#7C7666";
const BORDER = "#C9BFA6";

/**
 * RatingDistributionChart — per-dish 1-5 histogram (PLAN §7.5):
 * "bar fill --color-accent-matcha for bars 3-5 and --color-accent-clay for
 * bars 1-2 — a deliberate, subtle dual-tone that helps the admin's eye parse
 * 'below vs. at/above midpoint' without resorting to alarming red/green ...
 * the chart should look the same regardless of whether the distribution is
 * good or bad, per 3.5's 'no curation' principle."
 */
export function RatingDistributionChart({ data }: RatingDistributionChartProps) {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} strokeOpacity={0.5} vertical={false} />
        <XAxis
          dataKey="rating"
          tickFormatter={(v) => `${v}★`}
          tick={{ fill: INK_SUBTLE, fontSize: 12, fontFamily: "var(--font-sans)" }}
          axisLine={{ stroke: BORDER }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: INK_SUBTLE, fontSize: 12, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
          }}
          formatter={(value: number) => [value, "Ratings"]}
          labelFormatter={(label) => `${label} star${label === 1 ? "" : "s"}`}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={!prefersReducedMotion}>
          {data.map((entry) => (
            <Cell key={entry.rating} fill={entry.rating <= 2 ? ACCENT_CLAY : ACCENT_MATCHA} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
