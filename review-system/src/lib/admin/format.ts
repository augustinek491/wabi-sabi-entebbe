/**
 * Admin-only formatting helpers — Wabi-Sabi Entebbe review system.
 *
 * Framework-agnostic. Complements `src/lib/format.ts` (shared diner+admin
 * formatters) with admin-specific presentation: relative-delta framing
 * (PLAN-ADDENDUM §D2) and date-bucket labels for charts.
 */

/**
 * Formats a delta-from-menu-average for display, e.g. `+0.3` or `-0.5`.
 * Returns null if there's nothing to compare (no figure to render at all —
 * callers should fall back to "Not enough feedback yet" / an em dash, not an
 * empty delta).
 */
export function formatDelta(delta: number | null): string | null {
  if (delta === null) return null;
  if (delta === 0) return "±0.0";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
}

/**
 * One-line relative framing for a dish, e.g. "+0.3 vs menu average" or
 * "-0.5 vs menu average". Returns null if there's no baseline to compare to
 * (PLAN-ADDENDUM §D2 — lead with relative framing where data allows).
 */
export function relativeToMenuLabel(delta: number | null): string | null {
  const formatted = formatDelta(delta);
  if (formatted === null) return null;
  return `${formatted} vs menu average`;
}

/**
 * Formats an ISO day string ("2026-06-10") as a short axis label ("Jun 10")
 * for chart x-axes — distinct from `formatDayBucket` in `src/lib/format.ts`
 * (which includes the year, for prose) since chart axes need to stay compact.
 */
export function formatChartDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Today's date as an ISO "yyyy-mm-dd" string (UTC) — used as the default
 * upper bound for date-range inputs.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns an ISO "yyyy-mm-dd" string `days` days before today (UTC) — used
 * for quick date-range presets (7d / 30d / 90d).
 */
export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
