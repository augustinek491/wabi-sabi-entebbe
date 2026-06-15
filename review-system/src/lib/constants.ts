/**
 * Shared constants — Wabi-Sabi Entebbe review system.
 *
 * Centralizes copy and enum lists referenced by PLAN §3.3 (neutral question
 * framing), §3.8 (no positivity-skewing defaults), and §7 (brand/UI). Both
 * the diner flow and admin dashboard should import from here rather than
 * re-declaring chip lists or scale labels, so a future copy change happens
 * in one place.
 */

import type { DishTag, RatingValue, VisitTag } from "./types";

/**
 * Symmetric, behavioral labels for the 1–5 scale (PLAN §3.3).
 * The midpoint ("As expected") is genuinely neutral — not a disguised
 * failure state. No position is ever pre-selected (PLAN §3.8).
 */
export const RATING_LABELS: Record<RatingValue, string> = {
  1: "Didn't work for me",
  2: "Below expectations",
  3: "As expected",
  4: "Better than expected",
  5: "Exceptional",
};

/** Placeholder shown before any rating position has been tapped (PLAN §7.2). */
export const RATING_UNSELECTED_PLACEHOLDER = "Tap to rate";

/** Per-dish tag chips, in spec order (PLAN §7.3). */
export const DISH_TAGS: DishTag[] = ["taste", "portion", "value", "presentation"];

/** Per-visit tag chips, in spec order (PLAN §7.3). */
export const VISIT_TAGS: VisitTag[] = ["service", "ambiance", "speed", "value", "cleanliness"];

/** Human-readable labels for tag chips — capitalized for display. */
export const TAG_LABELS: Record<DishTag | VisitTag, string> = {
  taste: "Taste",
  portion: "Portion",
  value: "Value",
  presentation: "Presentation",
  service: "Service",
  ambiance: "Ambiance",
  speed: "Speed",
  cleanliness: "Cleanliness",
};

/** Placeholder for the optional comment field (PLAN §3.3 — explicitly licenses criticism). */
export const COMMENT_PLACEHOLDER = "Anything you noticed — good or otherwise";

/** Hard cap on comment length, enforced client + RPC + DB (PLAN-ADDENDUM §A9). */
export const COMMENT_MAX_LENGTH = 600;

/** Soft guidance threshold — character counter only appears past this point (PLAN §7.4). */
export const COMMENT_COUNTER_THRESHOLD = 400;

/**
 * Reviews submitted faster than this are flagged `is_low_effort = true`
 * (PLAN §3.4 #5) but ALWAYS stored and ALWAYS counted in aggregates by
 * default — never silently excluded (PLAN-ADDENDUM §B1).
 */
export const LOW_EFFORT_THRESHOLD_SECONDS = 5;

/** Service-window: how long a review_session remains valid for "one visit" (PLAN §3.4 #3). */
export const SERVICE_WINDOW_HOURS = 12;

/** Perceived-anonymity copy, shown at session start and at submit (PLAN-ADDENDUM §B2). */
export const ANONYMITY_NOTICE =
  "Anonymous. We can't see who you are — the kitchen hears the food, not the table.";

/** Calm, on-brand copy for an invalid/unrecognized table code (PLAN §4.2). */
export const INVALID_TABLE_CODE_MESSAGE =
  "This code isn't recognized. Ask a member of staff for a fresh one.";

/** Calm, never-technical retry copy for network errors (PLAN §2.2 / §4.3). */
export const GENERIC_ERROR_MESSAGE = "We couldn't load this right now.";

/** Brand name, used in headings/eyebrows across the app. */
export const BRAND_NAME = "Wabi-Sabi Entebbe";

/** Tagline (design-system/brand-guidelines.md §7). */
export const BRAND_TAGLINE = "A Japanese fusion restaurant.";

/** Demo table code used on the landing page link (no real restaurant_tables row required). */
export const DEMO_TABLE_CODE = "DEMO";
