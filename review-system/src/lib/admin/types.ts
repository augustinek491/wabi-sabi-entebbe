/**
 * Admin dashboard types — Wabi-Sabi Entebbe review system.
 *
 * Computed/derived shapes returned by `src/lib/admin/queries.ts`. These
 * layer on top of `database.types.ts` (the generated `dish_rating_summary` /
 * `visit_rating_trend` views + base tables) to add the things the admin UI
 * actually needs: relative framing against the menu-wide average
 * (PLAN-ADDENDUM §D2) and the minimum-sample gate (PLAN-ADDENDUM §B3).
 *
 * Framework-agnostic — no Next.js / React imports — so these can be reused
 * by both server components and any future route handlers.
 */

import type { DishTag } from "@/lib/types";

/**
 * Minimum number of ratings a dish needs before its average is treated as
 * meaningful enough to rank (PLAN-ADDENDUM §B3). Below this, the dish shows
 * "Not enough feedback yet" and is excluded from Most-loved / Needs-attention.
 */
export const MIN_RATING_COUNT = 5;

/**
 * A single dish row, enriched with category name (joined from
 * `menu_categories`, since `dish_rating_summary` only carries `category_id`)
 * and relative framing against the menu-wide average (PLAN-ADDENDUM §D2).
 */
export interface AdminDishSummary {
  menuItemId: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  /** Number of ratings backing `avgRating`. Always show this (§B3). */
  reviewCount: number;
  /** Null if `reviewCount === 0` (the view returns null avg for zero rows). */
  avgRating: number | null;
  /**
   * Whether this dish has enough data to be ranked / have its average shown
   * as authoritative (`reviewCount >= MIN_RATING_COUNT`, §B3).
   */
  hasEnoughData: boolean;
  /**
   * `avgRating - menuWideAverage`, rounded to 1 decimal. Null if either side
   * is unavailable (no rating yet, or no menu-wide average to compare to).
   * This is the "relative to menu average" framing (§D2) — the headline
   * figure is the *delta*, not the raw number alone.
   */
  deltaFromMenuAvg: number | null;
}

/** A single point on the visit-rating trend line (`visit_rating_trend` view). */
export interface AdminTrendPoint {
  /** ISO date string (day bucket), e.g. "2026-06-10". */
  day: string;
  reviewCount: number;
  avgOverall: number | null;
}

/** Overview KPIs for the dashboard header. */
export interface AdminOverviewStats {
  totalReviews: number;
  /** Overall average across all standard reviews in the (optional) date range. Null if zero reviews. */
  overallAverage: number | null;
  /** Menu-wide average dish rating across dishes WITH at least one rating. Used as the comparison baseline for §D2. Null if no dish has any rating yet. */
  menuWideAvgRating: number | null;
  /** Total dish-level rating rows (review_dish_ratings with rating not null) in range. */
  totalDishRatings: number;
}

/**
 * A "needs a look" or "most loved" entry — always carries `n=` (§B3) and is
 * only ever populated from dishes where `hasEnoughData === true`.
 */
export interface RankedDish {
  menuItemId: string;
  name: string;
  categoryName: string;
  avgRating: number;
  reviewCount: number;
  deltaFromMenuAvg: number | null;
}

/** A free-text comment for the "recent comments" panel — plain data, rendered as text nodes only (PLAN-ADDENDUM §A9). */
export interface AdminRecentComment {
  id: string;
  /** menu_items.name if this is a per-dish comment, null for an overall-visit comment. */
  dishName: string | null;
  rating: number | null;
  comment: string;
  createdAt: string;
  tags: DishTag[];
}

/** Tag-frequency entry for the tag-breakdown bar chart. */
export interface TagFrequency {
  tag: DishTag;
  label: string;
  count: number;
}

/** Rating distribution (count per 1-5 star bucket) for a single dish. */
export interface RatingDistribution {
  rating: 1 | 2 | 3 | 4 | 5;
  count: number;
}

/** Full detail payload for `/admin/dishes/[id]`. */
export interface AdminDishDetail {
  menuItemId: string;
  name: string;
  categoryName: string;
  reviewCount: number;
  avgRating: number | null;
  hasEnoughData: boolean;
  deltaFromMenuAvg: number | null;
  distribution: RatingDistribution[];
  tagFrequencies: TagFrequency[];
  recentComments: AdminRecentComment[];
  trend: AdminTrendPointForDish[];
}

/** A trend point scoped to a single dish (derived from review_dish_ratings, not the visit_rating_trend view which is visit-level). */
export interface AdminTrendPointForDish {
  day: string;
  reviewCount: number;
  avgRating: number | null;
}

/** Category option for the drill-down filter. */
export interface AdminCategoryOption {
  id: string;
  name: string;
  slug: string;
}

/** Date-range filter shape, parsed from search params. */
export interface AdminDateRange {
  /** ISO date string (inclusive), or null for "all time". */
  from: string | null;
  /** ISO date string (inclusive), or null for "all time". */
  to: string | null;
}
