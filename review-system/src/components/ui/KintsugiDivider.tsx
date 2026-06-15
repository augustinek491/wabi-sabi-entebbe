import type { HTMLAttributes } from "react";
import clsx from "clsx";

/**
 * KintsugiDivider — thin gold-seam horizontal rule.
 *
 * Per PLAN §7.6 #5, use exactly once per screen, at a meaningful transition
 * point (e.g. between "rate the dish" and "tell us more"). Never as
 * decorative wallpaper / repeated section dividers — that dilutes the motif
 * to meaninglessness.
 */
export function KintsugiDivider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={clsx("kintsugi", className)} {...props} />;
}
