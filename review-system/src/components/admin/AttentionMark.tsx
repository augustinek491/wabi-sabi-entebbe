import clsx from "clsx";

export interface AttentionMarkProps {
  /** Accessible label for the mark, e.g. "Needs attention". Announced via sr-only text. */
  label: string;
  className?: string;
}

/**
 * AttentionMark — the no-emoji "needs a look" indicator (PLAN-ADDENDUM §D1).
 *
 * v1.0 used a ⚠️ emoji for "Needs Attention" rows — explicitly removed.
 * Replaced with a small brass ensō (incomplete circle) dot, calm and
 * brand-consistent. Used inline before a dish name in the "Needs a look"
 * list and on flagged rows in the per-dish table.
 *
 * Color is never the *only* signal — `label` is always rendered for
 * assistive tech via `sr-only`, and callers should also rely on the
 * dish's position/section ("Needs a look" heading) for sighted users, not
 * this mark alone.
 */
export function AttentionMark({ label, className }: AttentionMarkProps) {
  return (
    <span className={clsx("inline-flex items-center", className)}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Small open brush-circle — same motif family as EnsoLoader, miniaturized. */}
        <path
          d="M 7.6 7.6 A 3.4 3.4 0 1 1 7.9 2.6"
          stroke="var(--ws-brass-500)"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
