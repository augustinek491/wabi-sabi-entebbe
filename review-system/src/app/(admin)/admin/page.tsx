import { SectionHeading, Card, Eyebrow, KintsugiDivider } from "@/components/ui";
import {
  DateRangeFilter,
  EmptyState,
  KpiCard,
  RankedDishList,
  RecentComments,
  TrendChart,
} from "@/components/admin";
import {
  fetchDishSummaries,
  fetchOverviewStats,
  fetchRecentComments,
  fetchVisitTrend,
  rankDishes,
} from "@/lib/admin/queries";
import { formatAvgRating } from "@/lib/format";
import { relativeToMenuLabel } from "@/lib/admin/format";
import { MIN_RATING_COUNT, type AdminDateRange } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

/**
 * `/admin` — dashboard Overview (PLAN §2.3 / §4.3, PLAN-ADDENDUM §B3/§D2).
 *
 * Reads via `createServiceClient()` (src/lib/admin/queries.ts) — server-only,
 * service-role client, never imported by a client component.
 *
 * Sections:
 *  - KPI row: total reviews, overall visit average, menu-wide dish average,
 *    total dish ratings — all carry `n=` where relevant.
 *  - "Most loved" / "Needs a look" — relative-to-menu framing (§D2), N<5
 *    excluded from ranking (§B3, enforced in `rankDishes`).
 *  - Visit-rating trend (Recharts line + volume bars).
 *  - Recent comments (free text rendered as plain React text nodes, §A9).
 *
 * Empty state: if there are zero reviews at all (regardless of date range),
 * shows the brand-true "No reviews yet" copy (PLAN §4.3) instead of a
 * KPI row full of zeros/dashes.
 */
export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const range: AdminDateRange = { from: params.from ?? null, to: params.to ?? null };

  const [stats, dishes, trend, recentComments] = await Promise.all([
    fetchOverviewStats(range),
    fetchDishSummaries(range),
    fetchVisitTrend(range),
    fetchRecentComments(10, range),
  ]);

  const { mostLoved, needsAttention } = rankDishes(dishes, 3);
  const hasAnyReviewsEver = stats.totalReviews > 0 || stats.totalDishRatings > 0;
  const hasRangeFilter = range.from !== null || range.to !== null;
  const noDataInRange = !hasAnyReviewsEver && hasRangeFilter;
  const noDataAtAll = !hasAnyReviewsEver && !hasRangeFilter;

  const menuAvgHelper = relativeToMenuLabel(
    stats.overallAverage !== null && stats.menuWideAvgRating !== null
      ? Math.round((stats.overallAverage - stats.menuWideAvgRating) * 10) / 10
      : null
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          as="h1"
          eyebrow="Overview"
          title="Dashboard"
          description="A relative read on this week's dishes and visits — sample size and the menu-wide average are shown alongside every figure."
        />
        <DateRangeFilter basePath="/admin" current={range} />
      </div>

      {noDataAtAll ? (
        <EmptyState
          title="No reviews yet"
          description="Once diners start scanning the table codes, results will appear here — usually within the first service."
        />
      ) : noDataInRange ? (
        <EmptyState
          title="No reviews in this range"
          description="Try a wider date range to see results."
          action={
            <a href="/admin" className="text-sm text-ink underline underline-offset-4 hover:text-primary-hover">
              View all-time →
            </a>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total reviews"
              value={stats.totalReviews}
              helper="Overall-visit submissions in range"
            />
            <KpiCard
              label="Overall average"
              value={formatAvgRating(stats.overallAverage)}
              helper={
                stats.totalReviews > 0 ? `n=${stats.totalReviews}` : "No visit ratings yet"
              }
            />
            <KpiCard
              label="Menu-wide dish average"
              value={formatAvgRating(stats.menuWideAvgRating)}
              helper={menuAvgHelper ?? "Baseline for the figures below"}
            />
            <KpiCard
              label="Dish ratings"
              value={stats.totalDishRatings}
              helper="Individual dish ratings in range"
            />
          </div>

          <KintsugiDivider />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankedDishList
              title="Most loved"
              variant="loved"
              items={mostLoved}
              emptyDescription={`Dishes need at least ${MIN_RATING_COUNT} ratings before they appear here — check back as more reviews come in.`}
            />
            <RankedDishList
              title="Needs a look (with enough data)"
              variant="attention"
              items={needsAttention}
              emptyDescription={`No dish has fallen below the menu average with enough data (${MIN_RATING_COUNT}+ ratings) yet.`}
            />
          </div>

          <Card className="flex flex-col gap-4">
            <Eyebrow>Visit rating trend</Eyebrow>
            {trend.length === 0 ? (
              <EmptyState
                title="Not enough data yet"
                description="The trend chart appears once visits have been rated on more than one day."
              />
            ) : (
              <TrendChart data={trend} />
            )}
          </Card>

          <RecentComments
            comments={recentComments}
            emptyDescription="No written comments yet — ratings and tags are shown above."
          />
        </>
      )}
    </div>
  );
}
