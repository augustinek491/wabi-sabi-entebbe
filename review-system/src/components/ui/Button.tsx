import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

/**
 * Button — the single primary-action element per screen.
 *
 * Variants:
 *   - "primary": gold fill (--color-primary) with dark-ink text
 *     (--color-on-primary). Reserve for the one primary CTA per screen
 *     ([Continue], [Submit]) — gold is an accent, never decorative filler.
 *   - "ghost": washi/transparent with an interactive-border outline. For
 *     secondary actions ([Back], [Skip]).
 *   - "link": text-only, brass underline on hover/focus. For tertiary
 *     actions ("Leave a note", "View all →").
 *
 * All variants:
 *   - >=44px touch target (PLAN §10) via min-height + padding.
 *   - Visible focus ring via :focus-visible (--color-focus), never removed.
 *   - 200ms --ease-calm transitions, respecting prefers-reduced-motion
 *     (handled globally in globals.css).
 */

type CommonProps = {
  variant?: "primary" | "ghost" | "link";
  /** Render full-width — used for the sticky bottom action bar (PLAN §4.4). */
  fullWidth?: boolean;
};

export type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: "button";
  };

export type LinkButtonProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: "a";
  };

const base =
  "inline-flex items-center justify-center gap-2 font-sans text-sm font-medium " +
  "transition-colors duration-200 ease-calm select-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<NonNullable<CommonProps["variant"]>, string> = {
  primary:
    "min-h-[44px] px-6 py-3 rounded-md bg-primary text-on-primary " +
    "hover:bg-primary-hover active:bg-primary-hover",
  ghost:
    "min-h-[44px] px-6 py-3 rounded-md bg-transparent text-ink " +
    "border-[1.5px] border-interactive-border hover:bg-surface-sunken",
  link: "min-h-[44px] px-1 py-2 text-ink-muted underline-offset-4 hover:underline hover:text-ink",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth, className, as: _as, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(base, variants[variant], fullWidth && "w-full", className)}
      {...props}
    />
  );
});

/**
 * Anchor-rendered variant of Button, for use with Next.js `<Link>` via the
 * `legacyBehavior`/`asChild`-style pattern, or plain `<a href>`.
 *
 * Example:
 *   <Link href="/r/DEMO" passHref legacyBehavior>
 *     <ButtonLink variant="primary">Begin</ButtonLink>
 *   </Link>
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, Omit<LinkButtonProps, "as">>(
  function ButtonLink({ variant = "primary", fullWidth, className, ...props }, ref) {
    return (
      <a
        ref={ref}
        className={clsx(base, variants[variant], fullWidth && "w-full", className)}
        {...props}
      />
    );
  }
);
