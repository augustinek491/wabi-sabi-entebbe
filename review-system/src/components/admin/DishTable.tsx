import Link from "next/link";
import { AttentionMark } from "./AttentionMark";
import { SampleBadge } from "./SampleBadge";
import { formatAvgRating } from "@/lib/format";
import { formatDelta } from "@/lib/admin/format";
import type { AdminDishSummary } from "@/lib/admin/types";

export interface DishTableProps {
  dishes: AdminDishSummary[];
}

/**
 * DishTable — sortable-by-nature (pre-sorted by caller), filterable per-dish
 * table (PLAN §2.3 `/admin/dishes`, PLAN §4.4 "dense tables scroll
 * horizontally with sticky first column").
 *
 * Every row shows `n=` (PLAN-ADDENDUM §B3). Rows below the minimum sample
 * show "Not enough feedback yet" in place of the average, and the
 * relative-to-menu delta is omitted entirely (nothing to compare reliably).
 * Rows below the menu-wide average AND with enough data get the brass ensō
 * `AttentionMark` (§D1, no emoji) next to the dish name — a quiet visual cue
 * consistent with the "Needs a look" panel, without a separate "status"
 * column that would read as an alarm.
 */
export function DishTable({ dishes }: DishTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse font-sans text-sm">
        <caption className="sr-only">Per-dish ratings, with sample size and relative framing against the menu average</caption>
        <thead>
          <tr className="border-b border-border text-left text-ink-subtle">
            <th scope="col" className="sticky left-0 bg-bg py-2 pr-4 font-medium uppercase tracking-wide text-xs">
              Dish
            </th>
            <th scope="col" className="py-2 pr-4 font-medium uppercase tracking-wide text-xs">
              Category
            </th>
            <th scope="col" className="py-2 pr-4 font-medium uppercase tracking-wide text-xs text-right">
              Average
            </th>
            <th scope="col" className="py-2 pr-4 font-medium uppercase tracking-wide text-xs text-right">
              vs Menu
            </th>
            <th scope="col" className="py-2 pr-4 font-medium uppercase tracking-wide text-xs text-right">
              Sample
            </th>
          </tr>
        </thead>
        <tbody>
          {dishes.map((dish) => {
            const flagged =
              dish.hasEnoughData && dish.deltaFromMenuAvg !== null && dish.deltaFromMenuAvg < 0;
            const delta = dish.hasEnoughData ? formatDelta(dish.deltaFromMenuAvg) : null;

            return (
              <tr key={dish.menuItemId} className="border-b border-border last:border-none">
                <th scope="row" className="sticky left-0 bg-bg py-3 pr-4 text-left font-normal">
                  <Link
                    href={`/admin/dishes/${dish.menuItemId}`}
                    className="flex items-center gap-2 text-ink hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded-sm"
                  >
                    {flagged ? <AttentionMark label="Below menu average" /> : null}
                    <span className="font-display text-base">{dish.name}</span>
                  </Link>
                </th>
                <td className="py-3 pr-4 text-ink-muted">{dish.categoryName}</td>
                <td className="py-3 pr-4 text-right text-ink">
                  {dish.hasEnoughData ? formatAvgRating(dish.avgRating) : "Not enough feedback yet"}
                </td>
                <td className="py-3 pr-4 text-right text-ink-subtle">{delta ?? "—"}</td>
                <td className="py-3 pr-4 text-right">
                  <SampleBadge count={dish.reviewCount} className="justify-end" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
