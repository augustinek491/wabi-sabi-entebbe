/**
 * Shared types — Wabi-Sabi Entebbe review system.
 *
 * These types mirror the data model in docs/IMPLEMENTATION-PLAN.md §5 and
 * docs/PLAN-ADDENDUM.md. They are the contract between the diner flow, the
 * admin dashboard, and the Supabase schema (applied separately via
 * migrations — see database.types.ts for the generated row types once the
 * schema exists).
 *
 * Keep this file framework-agnostic (no Next.js / React imports) so it can
 * be used from server components, client components, and route handlers
 * alike.
 */

/** The 1–5 rating scale. `null` means the diner explicitly skipped rating. */
export type Rating = 1 | 2 | 3 | 4 | 5 | null;

/**
 * Symmetric, behavioral labels for the 1–5 scale (PLAN §3.3 / §7.2).
 * Deliberately NOT valence-loaded ("Terrible…Amazing") — the midpoint must
 * read as genuinely neutral, not as a failure state.
 */
export type RatingValue = 1 | 2 | 3 | 4 | 5;

/** Per-dish tag chips (PLAN §7.3). Multi-select, no min/max. */
export type DishTag = "taste" | "portion" | "value" | "presentation";

/** Per-visit tag chips (PLAN §7.3). Multi-select, no min/max. */
export type VisitTag = "service" | "ambiance" | "speed" | "value" | "cleanliness";

/** A single dish's rating within a review session (review_dish_ratings). */
export interface DishRating {
  /** menu_items.id */
  menuItemId: string;
  /** Denormalized for display in the client reducer; not persisted on the row. */
  menuItemName?: string;
  rating: Rating;
  dishTags: DishTag[];
  /** Optional free text, capped at 600 chars (PLAN-ADDENDUM §A9). */
  comment: string | null;
}

/**
 * The in-progress review held in client state (sessionStorage) across the
 * diner flow, submitted atomically at the end via `submit_review` (PLAN
 * §6.5). Maps to the `submit_review` RPC's parameters.
 */
export interface ReviewDraft {
  /** review_sessions.id — created early via `start_session` (PLAN-ADDENDUM A1/v1.2). */
  sessionId: string | null;
  /** restaurant_tables.code — resolved from the URL, e.g. "t12". */
  tableCode: string;
  overallRating: Rating;
  visitTags: VisitTag[];
  /** Optional free text, capped at 600 chars (PLAN-ADDENDUM §A9). */
  comment: string | null;
  dishes: DishRating[];
  /** Client-measured, first paint -> submit. Feeds is_low_effort (never silently excluded — B1). */
  timeSpentSeconds: number;
  /** Hidden honeypot field — must remain empty. */
  honeypot: string;
}

/** Minimal shape used by the diner /select screen — mirrors menu_items + menu_categories. */
export interface MenuItemSummary {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  /** Raw price string as printed, e.g. "75,000" or "40,000 / 45,000 / 45,000". */
  priceDisplay: string;
  currency: string;
  displayOrder: number;
}

export interface MenuCategorySummary {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  items: MenuItemSummary[];
}

/**
 * Result shape of `get_table_context(code)` (PLAN-ADDENDUM §A6) — the only
 * thing the diner-facing app learns about a scanned table code. Deliberately
 * minimal and non-enumerable.
 */
export interface TableContext {
  tableId: string;
  tableCode: string;
  tableLabel: string;
  isActive: boolean;
}

/**
 * Aggregate row shape for `dish_rating_summary` (admin-only view, PLAN §5.2).
 * Per PLAN-ADDENDUM §B3, dishes with rating_count < 5 must show
 * "Not enough feedback yet" and be excluded from Top/Bottom rankings.
 */
export interface DishRatingSummary {
  menuItemId: string;
  name: string;
  categoryName: string;
  ratingCount: number;
  avgRating: number | null;
  ratingCountRaw: number;
  avgRatingRaw: number | null;
  divergenceCount: number;
}

/** Minimum sample size before a dish can be ranked or its average shown as authoritative (PLAN-ADDENDUM §B3). */
export const MIN_SAMPLE_SIZE = 5;
