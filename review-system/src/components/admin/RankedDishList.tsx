import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui";
import { AttentionMark } from "./AttentionMark";
import { SampleBadge } from "./SampleBadge";
import { EmptyState } from "./EmptyState";
import { relativeToMenuLabel } from "@/lib/admin/format";
import { formatAvgRating } from "@/lib/format";
import type { RankedDish } from "@/lib/admin/types";

export interface RankedDishListProps {
  title: string;
  items: RankedDish[];
  /** "loved" shows no attention mark; "attention" shows the brass ensō mark per row (PLAN-ADDENDUM §D1). */
  variant: "loved" | "attention";
  emptyDescription: string;
}

/**
 * RankedDishList — "Most loved" / "Needs a look" panel (PLAN §2.3, framed
 * per PLAN-ADDENDUM §D2: relative-to-menu-average, sample size always
 * visible, never ranked on N < 5 — callers MUST pre-filter via `rankDishes`
 * in `src/lib/admin/queries.ts`).
 *
 * No emoji (§D1) — the "attention" variant uses a thin brass ensō dot via
 * `AttentionMark`, not a warning icon.
 */
export function RankedDishList({ title, items, variant, emptyDescription }: RankedDishListProps) {
  return (
    <Card className="flex flex-col gap-4">
      <Eyebrow>{title}</Eyebrow>
      {items.length === 0 ? (
        <EmptyState
          title="Not enough data yet"
          description={emptyDescription}
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((dish, index) => {
            const relative = relativeToMenuLabel(dish.deltaFromMenuAvg);
            return (
              <li key={dish.menuItemId}>
                <Link
                  href={`/admin/dishes/${dish.menuItemId}`}
                  className="group flex items-start justify-between gap-4 rounded-md py-1.5 -mx-1.5 px-1.5 transition-colors duration-200 ease-calm hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-display text-base text-ink">
                      {variant === "attention" ? (
                        <AttentionMark label="Needs a look" />
                      ) : (
                        <span aria-hidden="true" className="text-ink-subtle text-sm font-sans">
                          {index + 1}.
                        </span>
                      )}
                      <span className="truncate">{dish.name}</span>
                    </span>
                    <span className="text-xs text-ink-subtle">{dish.categoryName}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                    <span className="font-display text-lg text-ink">
                      {formatAvgRating(dish.avgRating)}
                    </span>
                    {relative ? <span className="text-xs text-ink-subtle">{relative}</span> : null}
                    <SampleBadge count={dish.reviewCount} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
