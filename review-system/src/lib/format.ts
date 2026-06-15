/**
 * Shared formatting utilities — Wabi-Sabi Entebbe review system.
 */

import { RATING_LABELS } from "./constants";
import type { Rating, RatingValue } from "./types";

/**
 * Format a price string for display. menu.json (and the seeded
 * `menu_items.price_display`) stores price as a raw string to preserve
 * multi-variant formats like "40,000 / 45,000 / 45,000" — this function
 * is intentionally a passthrough/trim, not a numeric parser, so it never
 * loses information from those variant strings.
 */
export function formatPriceDisplay(priceDisplay: string, currency = "UGX"): string {
  const trimmed = priceDisplay.trim();
  if (!trimmed) return "";
  return `${trimmed} ${currency}`;
}

/** Look up the symmetric behavioral label for a rating value (PLAN §3.3 / §7.2). */
export function ratingLabel(value: Rating): string | null {
  if (value === null) return null;
  return RATING_LABELS[value as RatingValue] ?? null;
}

/**
 * Build the `aria-label` for the rating control's currently-focused/selected
 * position, e.g. "Rating: Below expectations (2 of 5)" (PLAN §10).
 */
export function ratingAriaLabel(value: RatingValue): string {
  return `Rating: ${RATING_LABELS[value]} (${value} of 5)`;
}

/**
 * Truncate free text for admin "recent comments" previews without cutting
 * mid-word where avoidable. Does not alter the stored value — display only.
 */
export function truncateComment(comment: string, maxLength = 140): string {
  if (comment.length <= maxLength) return comment;
  const cut = comment.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${safe.trimEnd()}…`;
}

/** Format a date for admin date-bucketed display (PLAN §9.1 — no down-to-the-minute timestamps shown). */
export function formatDayBucket(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Format a numeric average rating to one decimal place, or a placeholder if null/insufficient data. */
export function formatAvgRating(avg: number | null): string {
  if (avg === null) return "—";
  return avg.toFixed(1);
}
