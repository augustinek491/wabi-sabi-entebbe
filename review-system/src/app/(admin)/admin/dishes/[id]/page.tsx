import { notFound } from "next/navigation";
import Link from "next/link";
import { SectionHeading, Card, Eyebrow, KintsugiDivider } from "@/components/ui";
import {
  DateRangeFilter,
  DishTrendChart,
  EmptyState,
  KpiCard,
  RatingDistributionChart,
  RecentComments,
  SampleBadge,
  TagFrequencyChart,
} from "@/components/admin";
import { fetchDishDetail } from "@/lib/admin/queries";
import { formatAvgRating } from "@/lib/format";
import { formatDelta, relativeToMenuLabel } from "@/lib/admin/format";
import { MIN_RATING_COUNT, type AdminDateRange } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

/**
 * `/admin/dishes/[id]` — dish detail (PLAN §2.3 `/admin/dishes/[id]`):
 * rating distribution histogram, tag-chip frequency, free-text comments,
 * trend over time — framed relative to the menu average throughout
 * (PLAN-ADDENDUM §D2), with `n=` and the minimum-sample gate (§B3) applied
 * to the headline average and delta.
 *
 * `notFound()` if the menu item id doesn't resolve to a real dish.
 */
export default async function AdminDishDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const range: AdminDateRange = { from: sp.from ?? null, to: sp.to ?? null };

  const dish = await fetchDishDetail(id, range);

  if (!dish) {
    notFound();
  }

  const relative = relativeToMenuLabel(dish.deltaFromMenuAvg);
  const hasAnyRatings = dish.reviewCount > 0;
  const hasTagData = dish.tagFrequencies.some((t) => t.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href="/admin/dishes"
            className="text-sm text-ink-muted underline-offset-4 hover:underline hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded-sm w-fit"
          >
            ← All dishes
          </Link>
          <SectionHeading
            as="h1"
            eyebrow={dish.categoryName}
            title={dish.name}
            description={
              dish.hasEnoughData
                ? relative
                  ? `${relative}.`
                  : undefined
                : `Not enough feedback yet — averages and relative framing appear once this dish has at least ${MIN_RATING_COUNT} ratings.`
            }
          />
        </div>
        <DateRangeFilter basePath={`/admin/dishes/${dish.menuItemId}`} current={range} />
      </div>

      {!hasAnyRatings ? (
        <EmptyState
          title="No ratings yet for this dish"
          description="Once diners rate this dish, its average, distribution, and any comments will appear here."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Average rating"
              value={dish.hasEnoughData ? formatAvgRating(dish.avgRating) : "Not enough feedback yet"}
              helper={<SampleBadge count={dish.reviewCount} />}
            />
            <KpiCard
              label="vs menu average"
              value={dish.hasEnoughData ? formatDelta(dish.deltaFromMenuAvg) ?? "—" : "—"}
              helper={dish.hasEnoughData ? "vs menu average" : `Needs ${MIN_RATING_COUNT}+ ratings`}
            />
            <KpiCard label="Total ratings" value={dish.reviewCount} helper="In the selected range" />
          </div>

          <KintsugiDivider />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="flex flex-col gap-4">
              <Eyebrow>Rating distribution</Eyebrow>
              <RatingDistributionChart data={dish.distribution} />
            </Card>

            <Card className="flex flex-col gap-4">
              <Eyebrow>Tags noted</Eyebrow>
              {hasTagData ? (
                <TagFrequencyChart data={dish.tagFrequencies} />
              ) : (
                <EmptyState
                  title="No tags noted yet"
                  description="Taste, portion, value, and presentation tags will appear here once diners select them."
                />
              )}
            </Card>
          </div>

          <Card className="flex flex-col gap-4">
            <Eyebrow>Trend over time</Eyebrow>
            {dish.trend.length === 0 ? (
              <EmptyState
                title="Not enough data yet"
                description="The trend chart appears once this dish has been rated on more than one day."
              />
            ) : (
              <DishTrendChart data={dish.trend} />
            )}
          </Card>

          <RecentComments
            title="Comments for this dish"
            comments={dish.recentComments}
            emptyDescription="No written comments yet for this dish — ratings and tags are shown above."
          />
        </>
      )}
    </div>
  );
}
