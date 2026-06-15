import { SectionHeading, Eyebrow } from "@/components/ui";
import { ANONYMITY_NOTICE } from "@/lib/constants";

interface PageProps {
  params: Promise<{ code: string }>;
}

/**
 * `/r/[code]` — diner-facing landing (PLACEHOLDER).
 *
 * This is the entry point from the table QR code (PLAN §4.1 / §6.1). The
 * diner feature agent owns:
 *   - resolving `code` via `get_table_context(code)` (PLAN-ADDENDUM §A6) —
 *     do NOT query `restaurant_tables` directly from anon
 *   - session bootstrap (`start_session()`), already-reviewed check
 *   - the full select -> rate -> overall -> thanks flow (PLAN §2.2)
 *
 * This placeholder only confirms routing + the anonymity notice (PLAN-
 * ADDENDUM §B2) renders, using shared UI primitives.
 */
export default async function DinerLandingPage({ params }: PageProps) {
  const { code } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-6 px-6 py-12">
      <Eyebrow>Table {code}</Eyebrow>
      <SectionHeading
        as="h1"
        title="How was your meal?"
        description="This will only take a couple of minutes. Rate the dishes you had, or share your thoughts on the visit overall — whichever you'd rather."
      />
      <p className="text-sm text-ink-subtle">{ANONYMITY_NOTICE}</p>
      <p className="text-sm text-ink-subtle">
        (Diner flow placeholder — table resolution, session bootstrap, and
        the select / rate / overall / thanks screens are implemented by the
        diner feature agent.)
      </p>
    </main>
  );
}
