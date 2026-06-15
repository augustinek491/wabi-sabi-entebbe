import type { ElementType, HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { Eyebrow } from "./Eyebrow";

export interface SectionHeadingProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Small spaced-caps label above the heading, e.g. "STEP 2 OF 4". */
  eyebrow?: string;
  /** The heading text. Rendered in font-display. */
  title: ReactNode;
  /** Optional supporting copy below the title. */
  description?: ReactNode;
  /** Heading element — h1 for screen titles (one per screen, PLAN §10), h2/h3 for subsections. */
  as?: ElementType;
}

/**
 * SectionHeading — eyebrow + display-font title (+ optional description).
 *
 * Every diner screen has exactly one <h1> matching its visible headline
 * (PLAN §10 — screen-reader support). Pass `as="h1"` for the screen's main
 * heading so focus-management on route transitions (PLAN-ADDENDUM §F1) has
 * a clear target.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Heading = "h2",
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div className={clsx("flex flex-col gap-2", className)} {...props}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading className="text-2xl sm:text-3xl">{title}</Heading>
      {description ? (
        <p className="text-base text-ink-muted leading-normal max-w-measure">{description}</p>
      ) : null}
    </div>
  );
}
