"use client";

import { useId } from "react";
import { RatingScale, KintsugiDivider } from "@/components/ui";
import { CommentField } from "./CommentField";
import type { Rating, RatingValue } from "@/lib/types";

export interface OverallRatingFormProps {
  rating: Rating;
  comment: string;
  onRatingChange: (value: RatingValue) => void;
  onCommentChange: (value: string) => void;
}

/**
 * OverallRatingForm — "How was the visit overall?" (PLAN §2.2 OVERALL VISIT
 * RATING).
 *
 * Per the diner-flow brief's Requirements §5, the overall step is
 * `RatingScale` + optional comment only (the `submit_review` RPC signature
 * — `p_session_id, p_overall, p_comment, p_time_spent, p_dishes` — has no
 * visit-tags parameter, so visit-level tag chips are intentionally not
 * collected here to avoid silently-dropped UI state).
 */
export function OverallRatingForm({
  rating,
  comment,
  onRatingChange,
  onCommentChange,
}: OverallRatingFormProps) {
  const headingId = useId();

  return (
    <div className="flex flex-col gap-6">
      <RatingScale
        value={rating}
        onChange={onRatingChange}
        label="Rate your overall visit"
        describedById={headingId}
      />

      <KintsugiDivider />

      <CommentField value={comment} onChange={onCommentChange} label="Anything else?" />
    </div>
  );
}
