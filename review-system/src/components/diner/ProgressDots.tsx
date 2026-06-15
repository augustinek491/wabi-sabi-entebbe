import clsx from "clsx";

export interface ProgressDotsProps {
  /** 1-based index of the current step. */
  current: number;
  /** Total number of steps. */
  total: number;
  className?: string;
}

/**
 * ProgressDots — per-dish rating progress indicator (PLAN §2.2, "1/3, 2/3...").
 *
 * Visual dots are decorative (`aria-hidden`); the accessible state is
 * conveyed via a visually-hidden text equivalent ("Dish 2 of 3") so screen
 * readers get the same information without relying on dot color alone
 * (PLAN-ADDENDUM §F2 — never communicate state by color alone).
 */
export function ProgressDots({ current, total, className }: ProgressDotsProps) {
  if (total <= 1) return null;

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span className="sr-only">{`Dish ${current} of ${total}`}</span>
      <div aria-hidden="true" className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
          <span
            key={step}
            className={clsx(
              "block h-2 w-2 rounded-full transition-colors duration-200 ease-calm",
              step === current
                ? "bg-primary"
                : step < current
                  ? "bg-interactive-border"
                  : "border-[1.5px] border-interactive-border bg-transparent"
            )}
          />
        ))}
      </div>
      <span aria-hidden="true" className="text-sm text-ink-subtle">
        {current} of {total}
      </span>
    </div>
  );
}
