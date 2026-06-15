/**
 * Diner-flow-local types — Wabi-Sabi Entebbe review system.
 *
 * Mirrors the shape returned by the `get_table_context(p_code)` RPC
 * (supabase/migrations/0001_init.sql) and the `submit_review(...)` RPC's
 * request/response shapes. Kept local to `src/lib/diner` per the diner
 * feature agent's namespace — does not modify shared `src/lib/types.ts`.
 */

import type { DishTag, Rating } from "@/lib/types";

/** A single price/protein/size variant of a menu item, as stored in `menu_items.variants` (jsonb). */
export interface MenuItemVariant {
  /** Human-readable label, e.g. "Chicken", "Large", "Veg / Chicken / Pork". */
  label: string;
  /** Optional per-variant price string, if it differs from the item's base `price_display`. */
  priceDisplay?: string | null;
}

/** A single menu item as returned inside `get_table_context(...).menu[].items[]`. */
export interface DinerMenuItem {
  id: string;
  name: string;
  description: string | null;
  priceDisplay: string | null;
  variants: MenuItemVariant[];
}

/** A menu category as returned inside `get_table_context(...).menu[]`. */
export interface DinerMenuCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  items: DinerMenuItem[];
}

/** Full parsed result of `get_table_context(p_code)` — `null` means the code is invalid/inactive. */
export interface TableContextResult {
  table: {
    id: string;
    label: string;
  };
  menu: DinerMenuCategory[];
}

/**
 * One dish the diner selected + (optionally) rated, held in the in-progress
 * draft. Maps to one element of `submit_review`'s `p_dishes` array.
 */
export interface DraftDishEntry {
  menuItemId: string;
  /** Denormalized for display — not sent to the RPC beyond `menuItemId`. */
  name: string;
  categoryName: string;
  /** Chosen variant label, if the item has variants (PLAN-ADDENDUM §C2). `null` for single-variant items. */
  variant: string | null;
  rating: Rating;
  tags: DishTag[];
  comment: string | null;
}

/**
 * The full in-progress review, persisted to `sessionStorage` (PLAN §6.2 /
 * the per-agent brief's draft-persistence requirement). Submitted in one
 * shot via `submit_review(...)`.
 */
export interface DinerDraft {
  /** Schema version — bump if the shape changes, so stale drafts are discarded safely. */
  version: 1;
  tableCode: string;
  /** review_sessions.id, created lazily via `start_session(code)` on first rating or at submit. */
  sessionId: string | null;
  /** Client-measured first-interaction timestamp (ms epoch) — feeds `time_spent_seconds`. */
  startedAt: number;
  overallRating: Rating;
  overallComment: string | null;
  dishes: DraftDishEntry[];
  /** Set once `submit_review` has succeeded — guards against duplicate submits / stale tabs. */
  submitted: boolean;
}

/** Result shape of the `submit_review(...)` RPC on success. */
export interface SubmitReviewResult {
  ok: boolean;
  inserted: number;
  skipped: Array<{ menu_item_id: string; reason: string }>;
}

/** Build a fresh, empty draft for a given table code. */
export function createEmptyDraft(tableCode: string): DinerDraft {
  return {
    version: 1,
    tableCode,
    sessionId: null,
    startedAt: Date.now(),
    overallRating: null,
    overallComment: null,
    dishes: [],
    submitted: false,
  };
}
