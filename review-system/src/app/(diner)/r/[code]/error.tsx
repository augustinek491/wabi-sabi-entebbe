"use client";

import { useEffect } from "react";
import { Button, Eyebrow, SectionHeading } from "@/components/ui";
import { GENERIC_ERROR_MESSAGE } from "@/lib/constants";

/**
 * `/r/[code]` route-level error boundary.
 *
 * Next.js renders this if anything in `page.tsx` (or its children, e.g.
 * `ReviewFlow`) throws during render — distinct from the "invalid code" and
 * "couldn't load" states handled inline in `page.tsx`, which are normal
 * (non-throwing) results of `get_table_context(code)`.
 *
 * Calm, on-brand, never technical (PLAN §2.2 / §4.3) — no stack traces or
 * error codes shown to the diner. `reset()` re-renders the segment, which
 * re-mounts `page.tsx` and retries the table/menu fetch.
 */
export default function DinerLandingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Intentionally minimal: surface to the console for local debugging only.
    // No PII, no diner-identifying data ever passes through this boundary.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-6 px-6 py-12">
      <Eyebrow>Something went wrong</Eyebrow>
      <SectionHeading as="h1" title="We couldn't load this page" description={GENERIC_ERROR_MESSAGE} />
      <Button type="button" variant="ghost" fullWidth onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
