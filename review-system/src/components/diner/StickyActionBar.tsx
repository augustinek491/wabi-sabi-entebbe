import type { HTMLAttributes } from "react";
import clsx from "clsx";

export type StickyActionBarProps = HTMLAttributes<HTMLDivElement>;

/**
 * StickyActionBar — sticky bottom action bar for `[Next →]` / `[Submit]`
 * (PLAN §4.4): always reachable without scrolling, with a soft top-shadow
 * separating it from content.
 *
 * Wraps content in a `position: sticky` bar pinned to the viewport bottom,
 * padded for the iOS home-indicator safe area. The page content needs
 * bottom padding (`pb-28` or similar) so this bar never overlaps the last
 * content element — handled by the screen's outer layout.
 */
export function StickyActionBar({ className, children, ...props }: StickyActionBarProps) {
  return (
    <div
      className={clsx(
        "sticky bottom-0 left-0 right-0 -mx-6 mt-auto border-t border-border bg-bg/95 px-6 py-4",
        "shadow-[0_-6px_20px_-12px_rgba(22,21,15,0.18)] backdrop-blur-sm",
        "[padding-bottom:max(1rem,env(safe-area-inset-bottom))]",
        className
      )}
      {...props}
    >
      <div className="mx-auto flex max-w-[480px] flex-col gap-3">{children}</div>
    </div>
  );
}
