import clsx from "clsx";

export interface EnsoLoaderProps {
  /** Accessible label announced to screen readers, e.g. "Loading" or "Submitting". */
  label?: string;
  className?: string;
  size?: number;
}

/**
 * EnsoLoader — the brand's loading/submit motif (PLAN §7.6 #7 / §8 asset #3).
 *
 * STATIC by design in this shared primitive: renders a single open
 * (incomplete) brass-gold brush-circle as an SVG. No spin, no animation —
 * "no loading spinners, ever."
 *
 * Feature agents that want the "ensō stroke completing" entrance animation
 * (stroke-dashoffset draw-on) should build that as a CSS animation wrapped
 * in `@media (prefers-reduced-motion: no-preference)`, falling back to this
 * static mark under `prefers-reduced-motion: reduce` — do not modify this
 * component to spin by default.
 */
export function EnsoLoader({ label = "Loading", className, size = 64 }: EnsoLoaderProps) {
  return (
    <div role="status" className={clsx("inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Open brush-circle: ~300° arc, gap at the lower-right — hand-drawn,
            imperfect, asymmetric (per brand guidelines §5/§6). */}
        <path
          d="M 47.5 47.5
             A 22 22 0 1 1 50.5 19"
          stroke="var(--ws-brass-500)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
