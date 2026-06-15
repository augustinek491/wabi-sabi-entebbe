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
import type { AdminTrendPoint } from "@/lib/admin/types";

export interface TrendChartProps {
  data: AdminTrendPoint[];
}

// Resolve CSS custom properties to literal color values for Recharts (SVG
// stroke/fill don't reliably resolve var(...) inside <defs> gradients in all
// browsers, and Recharts needs string colors anyway). Values mirror
// globals.css's :root tokens (PLAN §7.1) — do not hardcode new colors here;
// if a token changes, update both places.
const BRASS_500 = "#B98A3C";
const BRASS_300 = "#D8B978";
const SURFACE_SUNKEN = "#E9E3D0";
const INK_SUBTLE = "#7C7666";
const BORDER = "#C9BFA6";

/**
 * TrendChart — visit-rating trend over time, line + review-volume bars
 * (PLAN §7.5 / §2.3).
 *
 * - Line: average overall rating per day, in brass (--ws-brass-500), with a
 *   low-opacity brass area-fill gradient underneath.
 * - Bars (secondary axis): review volume per day, in the sunken surface tone
 *   — a quiet "ink bar" rather than a loud secondary series.
 * - Gridlines: --color-border at reduced opacity (never harsh black).
 * - Axis labels: font-sans, text-xs, ink-subtle.
 * - Entrance: handled by the wrapping Card's normal render (no extra
 *   animation layer) — Recharts' built-in animations respect
 *   `prefers-reduced-motion` via the global CSS override that clamps
 *   animation/transition durations (globals.css), but Recharts animations
 *   are driven by JS timers rather than CSS, so we also explicitly disable
 *   animation under reduced motion via `isAnimationActive`.
 */
export function TrendChart({ data }: TrendChartProps) {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="ws-trend-fill" x1="0" y1="0" x2="0" y2="1">
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
            name === "avgOverall" ? [value?.toFixed?.(2) ?? value, "Avg rating"] : [value, "Reviews"]
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
          dataKey="avgOverall"
          stroke="none"
          fill="url(#ws-trend-fill)"
          isAnimationActive={!prefersReducedMotion}
        />
        <Line
          yAxisId="rating"
          type="monotone"
          dataKey="avgOverall"
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
