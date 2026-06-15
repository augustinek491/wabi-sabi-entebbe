"use client";

import { useId } from "react";
import { RatingScale, KintsugiDivider } from "@/components/ui";
import { CommentField } from "./CommentField";
import { DishTagChips } from "./DishTagChips";
import type { DraftDishEntry } from "@/lib/diner/types";
import type { DishTag, Rating, RatingValue } from "@/lib/types";

export interface DishRatingCardProps {
  dish: DraftDishEntry;
  onChange: (next: Partial<Pick<DraftDishEntry, "rating" | "tags" | "comment">>) => void;
}

/**
 * DishRatingCard — "How was the [dish]?" (PLAN §2.2 PER-DISH RATING).
 *
 * - `RatingScale` with no default selection (PLAN §3.8) — `rating` starts
 *   `null` in the draft and stays that way until the diner taps.
 * - Per-dish tag chips (taste/portion/value/presentation), optional.
 * - Optional comment, capped at 600 chars.
 * - Each per-dish screen is independent — no other dish's rating is shown
 *   here, preventing self-anchoring (PLAN §3.2).
 * - `[Next dish →]` is always enabled regardless of what's filled in here
 *   (enforced by the parent flow, not this component) — a diner can skip
 *   rating a dish numerically.
 */
export function DishRatingCard({ dish, onChange }: DishRatingCardProps) {
  const headingId = useId();

  const handleRatingChange = (value: RatingValue) => onChange({ rating: value });
  const handleTagsChange = (tags: DishTag[]) => onChange({ tags });
  const handleCommentChange = (comment: string) => onChange({ comment: comment || null });

  return (
    <div className="flex flex-col gap-6">
      <RatingScale
        value={dish.rating as Rating}
        onChange={handleRatingChange}
        label={`Rate the ${dish.name}`}
        describedById={headingId}
      />

      <KintsugiDivider />

      <DishTagChips selected={dish.tags} onChange={handleTagsChange} label={dish.name} />

      <CommentField
        value={dish.comment ?? ""}
        onChange={handleCommentChange}
        label={`Anything about the ${dish.name}?`}
      />
    </div>
  );
}
