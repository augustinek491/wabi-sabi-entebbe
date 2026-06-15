import { SectionHeading } from "@/components/ui";
import { CategoryFilter, DateRangeFilter, DishTable, EmptyState } from "@/components/admin";
import { fetchCategoryOptions, fetchDishSummaries } from "@/lib/admin/queries";
import type { AdminDateRange } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; category?: string }>;
}

/**
 * `/admin/dishes` — sortable per-dish table (PLAN §2.3 `/admin/dishes`).
 *
 * - Category drill-down (PLAN §2.3 "Filter by category") via `?category=`.
 * - Date-range filter via `?from=&to=` (shared with Overview).
 * - Sorted lowest-average-first by default within rows that have enough
 *   data (PLAN-ADDENDUM §D2 "lead with what needs a look"), then by name —
 *   rows without enough data sort after, alphabetically, so the table reads
 *   "things to look at first, then the long tail."
 * - Every row carries `n=` regardless of whether it has enough data
 *   (PLAN-ADDENDUM §B3).
 */
export default async function AdminDishesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const range: AdminDateRange = { from: params.from ?? null, to: params.to ?? null };
  const activeCategory = params.category ?? null;

  const [allDishes, categories] = await Promise.all([
    fetchDishSummaries(range),
    fetchCategoryOptions(),
  ]);

  const dishes = activeCategory
    ? allDishes.filter((d) => d.categoryId === activeCategory)
    : allDishes;

  const sorted = [...dishes].sort((a, b) => {
    if (a.hasEnoughData && b.hasEnoughData) {
      return (a.avgRating ?? 0) - (b.avgRating ?? 0);
    }
    if (a.hasEnoughData !== b.hasEnoughData) {
      return a.hasEnoughData ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          as="h1"
          eyebrow="Per-dish"
          title="Dishes"
          description="Every dish on the menu, with sample size and how it compares to the menu-wide average."
        />
        <DateRangeFilter basePath="/admin/dishes" current={range} preserveParams={{ category: params.category }} />
      </div>

      <CategoryFilter
        basePath="/admin/dishes"
        categories={categories}
        activeId={activeCategory}
        preserveParams={{ from: params.from, to: params.to }}
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="No dishes in this view"
          description="Try a different category or a wider date range."
        />
      ) : (
        <DishTable dishes={sorted} />
      )}
    </div>
  );
}
