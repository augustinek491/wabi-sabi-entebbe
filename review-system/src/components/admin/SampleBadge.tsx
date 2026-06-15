import clsx from "clsx";
import { MIN_RATING_COUNT } from "@/lib/admin/types";

export interface SampleBadgeProps {
  /** Number of ratings backing the figure this badge sits next to. */
  count: number;
  className?: string;
}

/**
 * SampleBadge — always-visible sample-size + confidence cue (PLAN-ADDENDUM
 * §B3): "ALWAYS show sample size (`n=`) and a confidence cue on every
 * figure. Never rank on tiny N."
 *
 * Renders `n=<count>` plus, when `count < MIN_RATING_COUNT`, a small
 * "limited data" qualifier — both as plain text, no color-only signal.
 */
export function SampleBadge({ count, className }: SampleBadgeProps) {
  const limited = count < MIN_RATING_COUNT;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-sans text-xs text-ink-subtle",
        className
      )}
    >
      <span>n={count}</span>
      {limited ? <span className="text-ink-subtle">· limited data</span> : null}
    </span>
  );
}
