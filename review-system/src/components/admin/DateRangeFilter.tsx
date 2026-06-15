import Link from "next/link";
import clsx from "clsx";
import { Eyebrow } from "@/components/ui";
import { daysAgoIso, todayIso } from "@/lib/admin/format";

export interface DateRangeFilterProps {
  /** The current path (without query string) so preset links can preserve other params. */
  basePath: string;
  /** Other search params to preserve (e.g. category filter). */
  preserveParams?: Record<string, string | undefined>;
  current: { from: string | null; to: string | null };
}

const PRESETS: { label: string; days: number | null }[] = [
  { label: "All time", days: null },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

/**
 * DateRangeFilter — simple preset date-range links (PLAN §2.3 header:
 * "date-range picker (Today / 7d / 30d / 90d / Custom)"). Implemented as
 * plain links with query params (`?from=&to=`) so it works without
 * client-side JS — server components re-render with the new range. "Custom"
 * is intentionally omitted for now (kept to presets, which the brief calls
 * "if straightforward") but the `from`/`to` query-param contract is ready
 * for a future custom-range input to hook into without changing query
 * helpers.
 */
export function DateRangeFilter({ basePath, preserveParams, current }: DateRangeFilterProps) {
  const isActive = (days: number | null) => {
    if (days === null) return current.from === null && current.to === null;
    return current.from === daysAgoIso(days) && current.to === null;
  };

  const hrefFor = (days: number | null) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preserveParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (days !== null) {
      params.set("from", daysAgoIso(days));
      params.set("to", todayIso());
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav aria-label="Date range" className="flex flex-wrap items-center gap-2">
      <Eyebrow className="mr-1">Range</Eyebrow>
      {PRESETS.map((preset) => {
        const active = isActive(preset.days);
        return (
          <Link
            key={preset.label}
            href={hrefFor(preset.days)}
            aria-current={active ? "true" : undefined}
            className={clsx(
              "inline-flex min-h-[36px] items-center rounded-pill border-[1.5px] px-3 py-1 font-sans text-sm transition-colors duration-200 ease-calm",
              active
                ? "border-sumi-900 bg-surface-sunken text-ink"
                : "border-interactive-border bg-transparent text-ink-muted hover:bg-surface-sunken"
            )}
          >
            {preset.label}
          </Link>
        );
      })}
    </nav>
  );
}
