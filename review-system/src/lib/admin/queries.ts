/**
 * Admin dashboard query helpers — Wabi-Sabi Entebbe review system.
 *
 * Server-only. Reads via `createServiceClient()` (src/lib/supabase/server.ts,
 * which itself imports `server-only`) — bypasses RLS, never import from a
 * client component.
 *
 * Implements:
 *  - PLAN-ADDENDUM §B3 (minimum-sample gate): every per-dish figure carries
 *    `reviewCount` and `hasEnoughData`; ranking helpers filter on
 *    `reviewCount >= MIN_RATING_COUNT` before sorting.
 *  - PLAN-ADDENDUM §D2 (relative framing): `deltaFromMenuAvg` compares each
 *    dish's average to the menu-wide average (computed only over dishes that
 *    themselves have at least one rating).
 *  - PLAN-ADDENDUM §A9 (XSS-safe): comments are returned as plain strings —
 *    callers render them as React text nodes, never via
 *    `dangerouslySetInnerHTML`.
 *
 * All functions accept an optional `AdminDateRange` to support the
 * date-range filter. Range bounds are applied to `created_at` /
 * `review_dish_ratings.created_at` as `>= from` (start of day) and
 * `<= to` (end of day), inclusive.
 */

import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { DISH_TAGS, TAG_LABELS } from "@/lib/constants";
import type { DishTag } from "@/lib/types";
import {
  MIN_RATING_COUNT,
  type AdminCategoryOption,
  type AdminDateRange,
  type AdminDishDetail,
  type AdminOverviewStats,
  type AdminRecentComment,
  type AdminTrendPoint,
  type AdminTrendPointForDish,
  type AdminDishSummary,
  type RankedDish,
  type RatingDistribution,
  type TagFrequency,
} from "./types";

/** Convert an AdminDateRange "to" bound (inclusive day) into an exclusive upper-bound ISO timestamp. */
function toExclusiveUpperBound(to: string): string {
  const d = new Date(`${to}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

function fromInclusiveLowerBound(from: string): string {
  return new Date(`${from}T00:00:00.000Z`).toISOString();
}

/**
 * Resolves category names for a set of category ids in one query.
 * `dish_rating_summary` only carries `category_id`, not the category name.
 */
async function fetchCategoryNames(
  categoryIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniqueIds = Array.from(new Set(categoryIds.filter(Boolean)));
  if (uniqueIds.length === 0) return map;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .select("id, name")
    .in("id", uniqueIds);

  if (error) {
    console.error("[admin] fetchCategoryNames failed", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id, row.name);
  }
  return map;
}

/**
 * Fetches all category options (for the drill-down filter), in display order.
 */
export async function fetchCategoryOptions(): Promise<AdminCategoryOption[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .select("id, name, slug, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[admin] fetchCategoryOptions failed", error);
    return [];
  }

  return (data ?? []).map((row) => ({ id: row.id, name: row.name, slug: row.slug }));
}

/**
 * Computes the menu-wide average rating across all dishes that have at least
 * one rating (PLAN-ADDENDUM §D2 baseline). Returns null if no dish has any
 * rating yet.
 *
 * Note: this is an unweighted average of per-dish averages (each dish
 * contributes equally regardless of its own N) — appropriate as a "what does
 * a typical dish on this menu score" baseline for relative framing, distinct
 * from a review-weighted overall average (which `overallAverage` in
 * `AdminOverviewStats` represents instead).
 */
function computeMenuWideAvg(rows: { avg_rating: number | null; review_count: number | null }[]): number | null {
  const ratedDishes = rows.filter(
    (r) => r.avg_rating !== null && (r.review_count ?? 0) > 0
  );
  if (ratedDishes.length === 0) return null;
  const sum = ratedDishes.reduce((acc, r) => acc + (r.avg_rating as number), 0);
  return Math.round((sum / ratedDishes.length) * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Fetches the full per-dish summary (`dish_rating_summary` view), enriched
 * with category names and relative framing.
 *
 * NOTE: `dish_rating_summary` is a pre-aggregated view with no `created_at`
 * column, so it cannot be date-range filtered directly. When `range` is
 * provided with non-null bounds, this function instead computes per-dish
 * counts/averages from `review_dish_ratings` joined to `menu_items` for the
 * given window. Outside a range (the common case), it reads the view
 * directly (cheaper, and matches the "all-time" default).
 */
export async function fetchDishSummaries(range?: AdminDateRange): Promise<AdminDishSummary[]> {
  const supabase = createServiceClient();

  if (range?.from || range?.to) {
    return fetchDishSummariesForRange(range);
  }

  const { data, error } = await supabase
    .from("dish_rating_summary")
    .select("menu_item_id, name, category_id, review_count, avg_rating");

  if (error) {
    console.error("[admin] fetchDishSummaries failed", error);
    return [];
  }

  const rows = data ?? [];
  const categoryNames = await fetchCategoryNames(
    rows.map((r) => r.category_id).filter((id): id is string => id !== null)
  );
  const menuWideAvg = computeMenuWideAvg(rows);

  return rows
    .filter((r) => r.menu_item_id !== null && r.name !== null)
    .map((r) => {
      const reviewCount = r.review_count ?? 0;
      const avgRating = r.avg_rating ?? null;
      return {
        menuItemId: r.menu_item_id as string,
        name: r.name as string,
        categoryId: r.category_id,
        categoryName: r.category_id ? categoryNames.get(r.category_id) ?? "Uncategorized" : "Uncategorized",
        reviewCount,
        avgRating,
        hasEnoughData: reviewCount >= MIN_RATING_COUNT,
        deltaFromMenuAvg:
          avgRating !== null && menuWideAvg !== null ? round1(avgRating - menuWideAvg) : null,
      };
    });
}

/**
 * Date-range-scoped variant of `fetchDishSummaries`. Computes per-dish
 * review_count / avg_rating from `review_dish_ratings` directly, since
 * `dish_rating_summary` has no time dimension.
 */
async function fetchDishSummariesForRange(range: AdminDateRange): Promise<AdminDishSummary[]> {
  const supabase = createServiceClient();

  // Fetch all menu items (name + category) once.
  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name, category_id");

  if (itemsError) {
    console.error("[admin] fetchDishSummariesForRange (menu_items) failed", itemsError);
    return [];
  }

  let ratingsQuery = supabase
    .from("review_dish_ratings")
    .select("menu_item_id, rating, created_at")
    .not("rating", "is", null);

  if (range.from) {
    ratingsQuery = ratingsQuery.gte("created_at", fromInclusiveLowerBound(range.from));
  }
  if (range.to) {
    ratingsQuery = ratingsQuery.lt("created_at", toExclusiveUpperBound(range.to));
  }

  const { data: ratings, error: ratingsError } = await ratingsQuery;

  if (ratingsError) {
    console.error("[admin] fetchDishSummariesForRange (review_dish_ratings) failed", ratingsError);
    return [];
  }

  const byItem = new Map<string, { sum: number; count: number }>();
  for (const r of ratings ?? []) {
    if (r.rating === null) continue;
    const entry = byItem.get(r.menu_item_id) ?? { sum: 0, count: 0 };
    entry.sum += r.rating;
    entry.count += 1;
    byItem.set(r.menu_item_id, entry);
  }

  const categoryNames = await fetchCategoryNames(
    (items ?? []).map((i) => i.category_id).filter((id): id is string => Boolean(id))
  );

  const rows = (items ?? []).map((item) => {
    const agg = byItem.get(item.id);
    const reviewCount = agg?.count ?? 0;
    const avgRating = agg && agg.count > 0 ? Math.round((agg.sum / agg.count) * 100) / 100 : null;
    return { menu_item_id: item.id, name: item.name, category_id: item.category_id, review_count: reviewCount, avg_rating: avgRating };
  });

  const menuWideAvg = computeMenuWideAvg(rows);

  return rows.map((r) => ({
    menuItemId: r.menu_item_id,
    name: r.name,
    categoryId: r.category_id,
    categoryName: r.category_id ? categoryNames.get(r.category_id) ?? "Uncategorized" : "Uncategorized",
    reviewCount: r.review_count,
    avgRating: r.avg_rating,
    hasEnoughData: r.review_count >= MIN_RATING_COUNT,
    deltaFromMenuAvg:
      r.avg_rating !== null && menuWideAvg !== null ? round1(r.avg_rating - menuWideAvg) : null,
  }));
}

/**
 * Splits a dish-summary list into "most loved" and "needs a look" rankings.
 * PLAN-ADDENDUM §B3: dishes with `reviewCount < MIN_RATING_COUNT` are
 * EXCLUDED from both lists, regardless of their (possibly extreme) average.
 *
 * "Needs a look" = lowest average among dishes with enough data.
 * "Most loved" = highest average among dishes with enough data.
 */
export function rankDishes(
  dishes: AdminDishSummary[],
  limit = 3
): { mostLoved: RankedDish[]; needsAttention: RankedDish[] } {
  const eligible = dishes.filter((d) => d.hasEnoughData && d.avgRating !== null);

  const toRanked = (d: AdminDishSummary): RankedDish => ({
    menuItemId: d.menuItemId,
    name: d.name,
    categoryName: d.categoryName,
    avgRating: d.avgRating as number,
    reviewCount: d.reviewCount,
    deltaFromMenuAvg: d.deltaFromMenuAvg,
  });

  const sortedDesc = [...eligible].sort((a, b) => (b.avgRating as number) - (a.avgRating as number));
  const sortedAsc = [...eligible].sort((a, b) => (a.avgRating as number) - (b.avgRating as number));

  return {
    mostLoved: sortedDesc.slice(0, limit).map(toRanked),
    needsAttention: sortedAsc.slice(0, limit).map(toRanked),
  };
}

/**
 * Fetches the visit-rating trend (`visit_rating_trend` view), optionally
 * scoped to a date range.
 */
export async function fetchVisitTrend(range?: AdminDateRange): Promise<AdminTrendPoint[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("visit_rating_trend")
    .select("day, review_count, avg_overall")
    .order("day", { ascending: true });

  if (range?.from) {
    query = query.gte("day", range.from);
  }
  if (range?.to) {
    query = query.lte("day", range.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin] fetchVisitTrend failed", error);
    return [];
  }

  return (data ?? [])
    .filter((r) => r.day !== null)
    .map((r) => ({
      day: r.day as string,
      reviewCount: r.review_count ?? 0,
      avgOverall: r.avg_overall ?? null,
    }));
}

/**
 * Computes the dashboard's headline KPIs.
 *
 * - `totalReviews` / `overallAverage`: from `reviews` (one row per
 *   review_session's overall visit rating) within `range`.
 * - `menuWideAvgRating`: from the dish summaries (PLAN-ADDENDUM §D2
 *   baseline) — note this is the *unweighted* average across rated dishes,
 *   intentionally different from `overallAverage` (which is the
 *   review-weighted average of overall-visit ratings). Both are shown so the
 *   admin can see "how visits felt overall" vs. "how dishes score on
 *   average."
 * - `totalDishRatings`: count of non-null per-dish ratings within `range`.
 */
export async function fetchOverviewStats(range?: AdminDateRange): Promise<AdminOverviewStats> {
  const supabase = createServiceClient();

  let reviewsQuery = supabase.from("reviews").select("overall_rating, created_at");
  if (range?.from) {
    reviewsQuery = reviewsQuery.gte("created_at", fromInclusiveLowerBound(range.from));
  }
  if (range?.to) {
    reviewsQuery = reviewsQuery.lt("created_at", toExclusiveUpperBound(range.to));
  }

  let dishRatingsQuery = supabase
    .from("review_dish_ratings")
    .select("rating, created_at")
    .not("rating", "is", null);
  if (range?.from) {
    dishRatingsQuery = dishRatingsQuery.gte("created_at", fromInclusiveLowerBound(range.from));
  }
  if (range?.to) {
    dishRatingsQuery = dishRatingsQuery.lt("created_at", toExclusiveUpperBound(range.to));
  }

  const [{ data: reviews, error: reviewsError }, { data: dishRatings, error: dishRatingsError }, dishes] =
    await Promise.all([reviewsQuery, dishRatingsQuery, fetchDishSummaries(range)]);

  if (reviewsError) {
    console.error("[admin] fetchOverviewStats (reviews) failed", reviewsError);
  }
  if (dishRatingsError) {
    console.error("[admin] fetchOverviewStats (review_dish_ratings) failed", dishRatingsError);
  }

  const reviewRows = reviews ?? [];
  const ratedReviews = reviewRows.filter((r) => r.overall_rating !== null);
  const overallAverage =
    ratedReviews.length > 0
      ? Math.round(
          (ratedReviews.reduce((acc, r) => acc + (r.overall_rating as number), 0) / ratedReviews.length) * 100
        ) / 100
      : null;

  const menuWideAvgRating = computeMenuWideAvg(
    dishes.map((d) => ({ avg_rating: d.avgRating, review_count: d.reviewCount }))
  );

  return {
    totalReviews: reviewRows.length,
    overallAverage,
    menuWideAvgRating,
    totalDishRatings: (dishRatings ?? []).length,
  };
}

/**
 * Fetches recent free-text comments (both per-dish and overall-visit) for
 * the "recent comments" panel, most-recent-first.
 *
 * Returns PLAIN STRINGS — callers MUST render `comment` as a React text node
 * (e.g. `<p>{comment}</p>`), never via `dangerouslySetInnerHTML`
 * (PLAN-ADDENDUM §A9).
 */
export async function fetchRecentComments(limit = 10, range?: AdminDateRange): Promise<AdminRecentComment[]> {
  const supabase = createServiceClient();

  // Per-dish comments.
  let dishQuery = supabase
    .from("review_dish_ratings")
    .select("id, menu_item_id, rating, comment, tags, created_at")
    .not("comment", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (range?.from) {
    dishQuery = dishQuery.gte("created_at", fromInclusiveLowerBound(range.from));
  }
  if (range?.to) {
    dishQuery = dishQuery.lt("created_at", toExclusiveUpperBound(range.to));
  }

  // Overall-visit comments.
  let overallQuery = supabase
    .from("reviews")
    .select("id, overall_rating, comment, created_at")
    .not("comment", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (range?.from) {
    overallQuery = overallQuery.gte("created_at", fromInclusiveLowerBound(range.from));
  }
  if (range?.to) {
    overallQuery = overallQuery.lt("created_at", toExclusiveUpperBound(range.to));
  }

  const [{ data: dishComments, error: dishError }, { data: overallComments, error: overallError }] =
    await Promise.all([dishQuery, overallQuery]);

  if (dishError) {
    console.error("[admin] fetchRecentComments (review_dish_ratings) failed", dishError);
  }
  if (overallError) {
    console.error("[admin] fetchRecentComments (reviews) failed", overallError);
  }

  const dishRows = dishComments ?? [];
  const menuItemIds = Array.from(new Set(dishRows.map((r) => r.menu_item_id)));

  let menuItemNames = new Map<string, string>();
  if (menuItemIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("menu_items")
      .select("id, name")
      .in("id", menuItemIds);
    if (itemsError) {
      console.error("[admin] fetchRecentComments (menu_items) failed", itemsError);
    } else {
      menuItemNames = new Map((items ?? []).map((i) => [i.id, i.name]));
    }
  }

  const fromDishRows: AdminRecentComment[] = dishRows
    .filter((r) => r.comment !== null)
    .map((r) => ({
      id: r.id,
      dishName: menuItemNames.get(r.menu_item_id) ?? null,
      rating: r.rating ?? null,
      comment: r.comment as string,
      createdAt: r.created_at,
      tags: (r.tags ?? []) as DishTag[],
    }));

  const fromOverallRows: AdminRecentComment[] = (overallComments ?? [])
    .filter((r) => r.comment !== null)
    .map((r) => ({
      id: r.id,
      dishName: null,
      rating: r.overall_rating ?? null,
      comment: r.comment as string,
      createdAt: r.created_at,
      tags: [],
    }));

  return [...fromDishRows, ...fromOverallRows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Computes tag frequencies across `review_dish_ratings.tags`, optionally
 * scoped to a single `menuItemId` and/or a date range. Used for the
 * tag-breakdown horizontal bar chart (PLAN §7.5).
 */
export async function fetchTagFrequencies(opts?: {
  menuItemId?: string;
  range?: AdminDateRange;
}): Promise<TagFrequency[]> {
  const supabase = createServiceClient();

  let query = supabase.from("review_dish_ratings").select("tags, created_at, menu_item_id");

  if (opts?.menuItemId) {
    query = query.eq("menu_item_id", opts.menuItemId);
  }
  if (opts?.range?.from) {
    query = query.gte("created_at", fromInclusiveLowerBound(opts.range.from));
  }
  if (opts?.range?.to) {
    query = query.lt("created_at", toExclusiveUpperBound(opts.range.to));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin] fetchTagFrequencies failed", error);
    return [];
  }

  const counts = new Map<DishTag, number>();
  for (const tag of DISH_TAGS) counts.set(tag, 0);

  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) {
      if ((DISH_TAGS as readonly string[]).includes(tag)) {
        const t = tag as DishTag;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
  }

  return DISH_TAGS.map((tag) => ({ tag, label: TAG_LABELS[tag], count: counts.get(tag) ?? 0 }));
}

/**
 * Fetches the full detail payload for `/admin/dishes/[id]`: summary +
 * relative framing, rating distribution, tag frequencies, recent comments,
 * and a per-dish trend over time.
 *
 * Returns `null` if the menu item doesn't exist.
 */
export async function fetchDishDetail(menuItemId: string, range?: AdminDateRange): Promise<AdminDishDetail | null> {
  const supabase = createServiceClient();

  const { data: item, error: itemError } = await supabase
    .from("menu_items")
    .select("id, name, category_id")
    .eq("id", menuItemId)
    .maybeSingle();

  if (itemError) {
    console.error("[admin] fetchDishDetail (menu_items) failed", itemError);
    return null;
  }
  if (!item) return null;

  const categoryNames = await fetchCategoryNames(item.category_id ? [item.category_id] : []);

  let ratingsQuery = supabase
    .from("review_dish_ratings")
    .select("rating, comment, tags, created_at")
    .eq("menu_item_id", menuItemId);

  if (range?.from) {
    ratingsQuery = ratingsQuery.gte("created_at", fromInclusiveLowerBound(range.from));
  }
  if (range?.to) {
    ratingsQuery = ratingsQuery.lt("created_at", toExclusiveUpperBound(range.to));
  }

  const [{ data: ratings, error: ratingsError }, allDishes] = await Promise.all([
    ratingsQuery,
    fetchDishSummaries(range),
  ]);

  if (ratingsError) {
    console.error("[admin] fetchDishDetail (review_dish_ratings) failed", ratingsError);
  }

  const rows = ratings ?? [];
  const ratedRows = rows.filter((r) => r.rating !== null);
  const reviewCount = ratedRows.length;
  const avgRating =
    reviewCount > 0
      ? Math.round((ratedRows.reduce((acc, r) => acc + (r.rating as number), 0) / reviewCount) * 100) / 100
      : null;

  const summary = allDishes.find((d) => d.menuItemId === menuItemId);
  const menuWideAvg = computeMenuWideAvg(allDishes.map((d) => ({ avg_rating: d.avgRating, review_count: d.reviewCount })));

  // Distribution (1-5 buckets).
  const distCounts = new Map<number, number>([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
  for (const r of ratedRows) {
    const v = r.rating as number;
    distCounts.set(v, (distCounts.get(v) ?? 0) + 1);
  }
  const distribution: RatingDistribution[] = [1, 2, 3, 4, 5].map((rating) => ({
    rating: rating as 1 | 2 | 3 | 4 | 5,
    count: distCounts.get(rating) ?? 0,
  }));

  // Tag frequencies (within range).
  const tagCounts = new Map<DishTag, number>();
  for (const tag of DISH_TAGS) tagCounts.set(tag, 0);
  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      if ((DISH_TAGS as readonly string[]).includes(tag)) {
        const t = tag as DishTag;
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
  }
  const tagFrequencies: TagFrequency[] = DISH_TAGS.map((tag) => ({
    tag,
    label: TAG_LABELS[tag],
    count: tagCounts.get(tag) ?? 0,
  }));

  // Recent comments for this dish (plain text — §A9).
  const recentComments: AdminRecentComment[] = rows
    .filter((r) => r.comment !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((r, idx) => ({
      id: `${menuItemId}-${idx}-${r.created_at}`,
      dishName: item.name,
      rating: r.rating ?? null,
      comment: r.comment as string,
      createdAt: r.created_at,
      tags: (r.tags ?? []) as DishTag[],
    }));

  // Per-dish trend: bucket ratedRows by day.
  const byDay = new Map<string, { sum: number; count: number }>();
  for (const r of ratedRows) {
    const day = r.created_at.slice(0, 10);
    const entry = byDay.get(day) ?? { sum: 0, count: 0 };
    entry.sum += r.rating as number;
    entry.count += 1;
    byDay.set(day, entry);
  }
  const trend: AdminTrendPointForDish[] = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, { sum, count }]) => ({
      day,
      reviewCount: count,
      avgRating: count > 0 ? Math.round((sum / count) * 100) / 100 : null,
    }));

  const categoryName = item.category_id ? categoryNames.get(item.category_id) ?? "Uncategorized" : "Uncategorized";

  return {
    menuItemId: item.id,
    name: item.name,
    categoryName,
    reviewCount,
    avgRating,
    hasEnoughData: reviewCount >= MIN_RATING_COUNT,
    deltaFromMenuAvg:
      summary?.deltaFromMenuAvg ??
      (avgRating !== null && menuWideAvg !== null ? round1(avgRating - menuWideAvg) : null),
    distribution,
    tagFrequencies,
    recentComments,
    trend,
  };
}
