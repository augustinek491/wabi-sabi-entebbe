import { SectionHeading, Card } from "@/components/ui";

/**
 * `/admin` — dashboard overview (PLACEHOLDER).
 *
 * The admin feature agent owns the real Overview screen (PLAN §2.3 / §4.3):
 * KPI cards, top/bottom dishes (respecting the N<5 minimum-sample gate,
 * PLAN-ADDENDUM §B3), trend chart, recent comments — all read via
 * `createServiceClient()` from `src/lib/supabase/server.ts` (server
 * components only, never client-imported).
 *
 * This placeholder only confirms routing + the layout's nav shell render.
 */
export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        as="h1"
        eyebrow="Overview"
        title="Dashboard"
        description="KPI cards, top/bottom dishes, trend chart, and recent comments are implemented by the admin feature agent — reading via the server-side service-role client only."
      />
      <Card>
        <p className="text-sm text-ink-subtle">
          No reviews yet. Once diners start scanning the table codes, results
          will appear here — usually within the first service.
        </p>
      </Card>
    </div>
  );
}
