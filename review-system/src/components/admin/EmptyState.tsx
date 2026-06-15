import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export interface EmptyStateProps {
  title: string;
  description: ReactNode;
  /** Optional secondary action/link, e.g. "View all-time →". */
  action?: ReactNode;
}

/**
 * EmptyState — graceful, on-brand empty state for admin panels (PLAN §4.3 /
 * §2.3): "No reviews yet. Once diners start scanning the table codes,
 * results will appear here — usually within the first service."
 *
 * Uses the shared `Card` (sunken tone) — no stock "empty box" icon, no
 * emoji. A faint seigaiha wash is reserved for full-page empty states
 * (PLAN §7.1's "faint texture on dashboard empty states only") — this
 * component stays plain so it can be reused for smaller in-page panels
 * (e.g. "no comments yet for this dish") without competing with a page-level
 * empty state.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card tone="sunken" className="flex flex-col items-start gap-2 text-left">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="text-sm text-ink-muted max-w-measure">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </Card>
  );
}
