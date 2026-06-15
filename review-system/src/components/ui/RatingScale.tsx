"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import clsx from "clsx";
import { RATING_LABELS, RATING_UNSELECTED_PLACEHOLDER } from "@/lib/constants";
import { ratingAriaLabel } from "@/lib/format";
import type { Rating, RatingValue } from "@/lib/types";

export interface RatingScaleProps {
  /** Current value. `null` = unselected (the required initial state — PLAN §3.8). */
  value: Rating;
  /** Called with the newly-selected value. Never called with `null` by user interaction. */
  onChange: (value: RatingValue) => void;
  /**
   * Accessible name for the radiogroup, e.g. "Rate the Salmon Nigiri" or
   * "Rate your overall visit". Required — every rating control must be
   * tied to a label (PLAN §10).
   */
  label: string;
  /** Optional id of an element (e.g. the dish-name <h1>) that also describes this control. */
  describedById?: string;
  disabled?: boolean;
  className?: string;
}

const VALUES: RatingValue[] = [1, 2, 3, 4, 5];

/**
 * RatingScale — THE anti-anchoring control (PLAN §3.3, §3.8, §7.2, §10).
 *
 * - 5 circular touch targets (>=48x48px), each independently tappable —
 *   tapping position 2 selects 2 directly, it does not "fill up to 2" from
 *   a different starting point.
 * - NO DEFAULT SELECTION. `value === null` on first render and stays that
 *   way until the diner taps. This is load-bearing for PLAN §3.8
 *   ("no star-rating defaults pre-set to anything other than
 *   unselected/neutral") — do not give this component a default value prop.
 * - Symmetric, behavioral labels (PLAN §3.3) — "As expected" is the neutral
 *   midpoint, not a disguised failure state.
 * - Unselected circles use `--color-interactive-border` (>=3:1 on washi,
 *   PLAN-ADDENDUM §E1) — NOT `--color-border-strong`, which is decorative-
 *   only and fails the 3:1 non-text contrast requirement.
 * - Selected circles 1..N fill with `--gradient-brass`; circle N gets a
 *   subtle lift (shadow-soft-sm). Selection state is communicated by fill +
 *   shadow + the label text changing — never by color alone (PLAN §10).
 * - Implemented as `role="radiogroup"` / `role="radio"` per the WAI-ARIA
 *   radio pattern: Tab enters/exits the group once; Arrow Left/Right (and
 *   Up/Down) move the roving tabindex and select; Space/Enter also select
 *   the focused option. Screen readers announce a single 5-option choice.
 * - `prefers-reduced-motion`: fill is a cross-fade (opacity), not an
 *   animated width/transform — handled via the `transition-opacity
 *   duration-200` utility plus the global reduced-motion override in
 *   globals.css which clamps all durations to ~0.
 */
export function RatingScale({
  value,
  onChange,
  label,
  describedById,
  disabled = false,
  className,
}: RatingScaleProps) {
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(VALUES.length - 1, index));
    refs.current[clamped]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": {
        event.preventDefault();
        const next = (index + 1) % VALUES.length;
        focusIndex(next);
        onChange(VALUES[next]);
        break;
      }
      case "ArrowLeft":
      case "ArrowUp": {
        event.preventDefault();
        const prev = (index - 1 + VALUES.length) % VALUES.length;
        focusIndex(prev);
        onChange(VALUES[prev]);
        break;
      }
      case "Home": {
        event.preventDefault();
        focusIndex(0);
        onChange(VALUES[0]);
        break;
      }
      case "End": {
        event.preventDefault();
        focusIndex(VALUES.length - 1);
        onChange(VALUES[VALUES.length - 1]);
        break;
      }
      case " ":
      case "Enter": {
        event.preventDefault();
        onChange(VALUES[index]);
        break;
      }
      default:
        break;
    }
  };

  const helperText = value === null ? RATING_UNSELECTED_PLACEHOLDER : RATING_LABELS[value];
  const helperId = `${baseId}-helper`;

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <div
        role="radiogroup"
        aria-label={label}
        aria-describedby={[describedById, helperId].filter(Boolean).join(" ") || undefined}
        className="flex items-center gap-3 sm:gap-4"
      >
        {VALUES.map((option, index) => {
          const isSelected = value !== null && option <= value;
          const isActiveOption = value === option;
          // Roving tabindex: only the selected option (or the first, if
          // none selected) is in the tab sequence.
          const tabIndex = value === null ? (index === 0 ? 0 : -1) : isActiveOption ? 0 : -1;

          return (
            <button
              key={option}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isActiveOption}
              aria-label={ratingAriaLabel(option)}
              tabIndex={tabIndex}
              disabled={disabled}
              onClick={() => onChange(option)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={clsx(
                "flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full",
                "transition-[background,box-shadow,opacity] duration-200 ease-calm",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? "bg-gradient-brass border-[1.5px] border-transparent"
                  : "bg-transparent border-[1.5px] border-interactive-border",
                isActiveOption && "shadow-soft-sm"
              )}
            >
              {/* Small brush-stroke mark inside each circle — decorative, hidden from AT. */}
              <span
                aria-hidden="true"
                className={clsx(
                  "block h-2 w-2 rounded-full",
                  isSelected ? "bg-on-primary/70" : "bg-interactive-border"
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Dynamic label text — placeholder before any tap, behavioral label after. */}
      <p
        id={helperId}
        aria-live="polite"
        className={clsx(
          "text-sm font-sans",
          value === null ? "text-ink-subtle" : "text-ink-muted"
        )}
      >
        {helperText}
      </p>
    </div>
  );
}
