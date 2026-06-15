import type { HTMLAttributes } from "react";
import clsx from "clsx";

/**
 * Eyebrow — small spaced-caps label (e.g. "STEP 2 OF 4", "TOP RATED").
 *
 * Jost, uppercase, --tracking-widest, --color-primary. Brass is used here as
 * text because eyebrows are small/sparing labels, not body copy — consistent
 * with the existing `.ws-eyebrow` utility in globals.css.
 */
export function Eyebrow({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={clsx("ws-eyebrow", className)} {...props}>
      {children}
    </span>
  );
}
