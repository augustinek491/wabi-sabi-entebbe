import type { HTMLAttributes } from "react";
import clsx from "clsx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * "raised" (default): --color-surface with --shadow-sm — the standard
   * rating-screen / KPI card.
   * "sunken": --color-surface-sunken, no shadow — for the selected-dish
   * summary strip, "needs attention" panel background, etc.
   */
  tone?: "raised" | "sunken";
}

/**
 * Card — generic content container.
 *
 * Uses --radius-lg (not --radius-organic — that's reserved for exactly one
 * hero element per flow, per PLAN §7.1). Hairline border + soft warm shadow,
 * never harsh.
 */
export function Card({ tone = "raised", className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border p-5 sm:p-6",
        tone === "raised" && "bg-surface shadow-soft-sm",
        tone === "sunken" && "bg-surface-sunken",
        className
      )}
      {...props}
    />
  );
}
