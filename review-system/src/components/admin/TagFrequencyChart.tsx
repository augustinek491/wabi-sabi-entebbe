import type { TagFrequency } from "@/lib/admin/types";

export interface TagFrequencyChartProps {
  data: TagFrequency[];
}

/**
 * TagFrequencyChart — horizontal "ink bar" frequency chart (PLAN §7.5):
 * "horizontal bar chart, bars in --color-surface-sunken with --border-ink
 * outline, length = frequency — reads like a minimalist 'ink bar' rather
 * than a typical SaaS dashboard bar."
 *
 * Built with plain divs (not Recharts) — a horizontal frequency bar with a
 * fixed label column doesn't need a charting library, and this keeps the
 * "ink bar" reading literal (a solid-outlined rectangle, not an SVG chart
 * with axes/gridlines). Respects `prefers-reduced-motion` via the global
 * CSS override (width transition).
 */
export function TagFrequencyChart({ data }: TagFrequencyChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-3" role="img" aria-label="Tag frequency breakdown">
      {data.map((entry) => {
        const widthPct = (entry.count / max) * 100;
        return (
          <div key={entry.tag} className="flex items-center gap-3">
            <span className="w-28 shrink-0 font-sans text-sm text-ink-muted">{entry.label}</span>
            <div className="flex-1 h-6 rounded-sm bg-transparent border-[1.5px] border-interactive-border overflow-hidden">
              <div
                className="h-full bg-surface-sunken border-r-[1.5px] border-sumi-900 transition-[width] duration-400 ease-calm"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-sans text-sm text-ink-subtle">{entry.count}</span>
          </div>
        );
      })}
    </div>
  );
}
