"use client";

import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export interface TagChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * TagChip — toggleable pill-shaped tag (PLAN §7.3).
 *
 * - Multi-select, no min/max — caller manages the selected-set; this
 *   component is uncontrolled beyond its own `selected` boolean.
 * - Unselected: `--color-interactive-border` outline (>=3:1, PLAN-ADDENDUM
 *   §E1), transparent background, `--color-ink` text.
 * - Selected: `--color-surface-sunken` fill + `--border-ink` (1.5px sumi)
 *   outline + a small filled-circle indicator — deliberately NOT brass.
 *   Brass stays reserved for the primary CTA and the rating fill (the
 *   "single accent" rule, PLAN §7.1/§7.6) so chip-selection doesn't compete
 *   visually with the rating control.
 * - >=44px touch target via padding (the visual pill is smaller, but the
 *   hit area extends to meet PLAN §10).
 * - `aria-pressed` communicates toggle state to assistive tech.
 */
export function TagChip({ selected, onToggle, children, className, ...props }: TagChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={clsx(
        "inline-flex min-h-[44px] items-center gap-2 rounded-pill px-4 py-2",
        "font-sans text-sm uppercase tracking-wide",
        "transition-[background,border-color] duration-200 ease-calm",
        selected
          ? "bg-surface-sunken border-[1.5px] border-sumi-900 text-ink"
          : "bg-transparent border-[1.5px] border-interactive-border text-ink",
        className
      )}
      {...props}
    >
      {selected ? (
        <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full bg-sumi-900" />
      ) : null}
      {children}
    </button>
  );
}
