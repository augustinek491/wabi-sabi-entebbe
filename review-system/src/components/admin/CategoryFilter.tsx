import Link from "next/link";
import clsx from "clsx";
import { Eyebrow } from "@/components/ui";
import type { AdminCategoryOption } from "@/lib/admin/types";

export interface CategoryFilterProps {
  basePath: string;
  categories: AdminCategoryOption[];
  /** Currently-selected category id, or null for "All categories". */
  activeId: string | null;
  /** Other search params to preserve (e.g. date range). */
  preserveParams?: Record<string, string | undefined>;
}

/**
 * CategoryFilter — category drill-down for `/admin/dishes` (PLAN §2.3 "Filter
 * by category"). Plain links + query param (`?category=<id>`), preserving
 * the date-range params — works without client JS, server component
 * re-renders with the filtered dish list.
 */
export function CategoryFilter({ basePath, categories, activeId, preserveParams }: CategoryFilterProps) {
  const hrefFor = (id: string | null) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preserveParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (id) params.set("category", id);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav aria-label="Filter by category" className="flex flex-wrap items-center gap-2">
      <Eyebrow className="mr-1">Category</Eyebrow>
      <Link
        href={hrefFor(null)}
        aria-current={activeId === null ? "true" : undefined}
        className={clsx(
          "inline-flex min-h-[36px] items-center rounded-pill border-[1.5px] px-3 py-1 font-sans text-sm transition-colors duration-200 ease-calm",
          activeId === null
            ? "border-sumi-900 bg-surface-sunken text-ink"
            : "border-interactive-border bg-transparent text-ink-muted hover:bg-surface-sunken"
        )}
      >
        All
      </Link>
      {categories.map((category) => {
        const active = activeId === category.id;
        return (
          <Link
            key={category.id}
            href={hrefFor(category.id)}
            aria-current={active ? "true" : undefined}
            className={clsx(
              "inline-flex min-h-[36px] items-center rounded-pill border-[1.5px] px-3 py-1 font-sans text-sm transition-colors duration-200 ease-calm",
              active
                ? "border-sumi-900 bg-surface-sunken text-ink"
                : "border-interactive-border bg-transparent text-ink-muted hover:bg-surface-sunken"
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}
