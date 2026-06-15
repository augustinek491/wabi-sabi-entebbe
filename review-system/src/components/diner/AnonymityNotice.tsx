import clsx from "clsx";
import { ANONYMITY_NOTICE } from "@/lib/constants";

export interface AnonymityNoticeProps {
  className?: string;
  /** Visual emphasis — "subtle" for in-flow reminders, "prominent" for the landing/submit moments (PLAN-ADDENDUM §B2). */
  tone?: "subtle" | "prominent";
}

/**
 * AnonymityNotice — the perceived-anonymity reassurance copy
 * (PLAN-ADDENDUM §B2), shown at session start and again near submit.
 *
 * "prominent" renders inside a sunken card with a small ink-dot mark (no
 * emoji, per brand) so it reads as a calm aside rather than a legal notice.
 * "subtle" is a plain muted line for secondary screens.
 */
export function AnonymityNotice({ className, tone = "subtle" }: AnonymityNoticeProps) {
  if (tone === "prominent") {
    return (
      <div
        className={clsx(
          "flex items-start gap-3 rounded-lg bg-surface-sunken p-4 text-sm text-ink-muted",
          className
        )}
      >
        <span
          aria-hidden="true"
          className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
        />
        <p>{ANONYMITY_NOTICE}</p>
      </div>
    );
  }

  return <p className={clsx("text-sm text-ink-subtle", className)}>{ANONYMITY_NOTICE}</p>;
}
