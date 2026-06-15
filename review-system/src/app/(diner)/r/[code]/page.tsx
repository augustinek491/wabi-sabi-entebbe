"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Eyebrow, SectionHeading, EnsoLoader } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import { GENERIC_ERROR_MESSAGE, INVALID_TABLE_CODE_MESSAGE } from "@/lib/constants";
import { parseTableContext } from "@/lib/diner/menu";
import type { TableContextResult } from "@/lib/diner/types";
import { ReviewFlow } from "@/components/diner/ReviewFlow";

/**
 * Always render this route dynamically — the table/menu context depends on
 * the `code` path segment and is resolved at request time via
 * `get_table_context(code)` (PLAN-ADDENDUM §A6). Nothing here is safe to
 * statically cache.
 */
export const dynamic = "force-dynamic";

type LoadState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "error" }
  | { status: "ready"; context: TableContextResult };

/**
 * `/r/[code]` — the diner-facing entry point from the table QR code (PLAN
 * §4.1 / §6.1).
 *
 * A client component because:
 *  - `get_table_context(code)` must be called via the anon browser Supabase
 *    client (RPC-only contract, PLAN-ADDENDUM §A6) — there is no
 *    server-readable table for this route to query directly.
 *  - The rest of the journey (`ReviewFlow`) is entirely client-side
 *    (sessionStorage draft, lazy `start_session`, final `submit_review`).
 *
 * States:
 *  - loading  -> handled by `loading.tsx` on first paint, then this local
 *                "loading" state covers the RPC round trip itself
 *  - invalid  -> `get_table_context` returned `null` (unrecognized/inactive
 *                code) — calm "table not found" screen, no retry (a fresh
 *                code from staff is the only fix)
 *  - error    -> network/RPC failure — calm retry screen (distinct from
 *                `error.tsx`, which only catches render-time exceptions)
 *  - ready    -> hand off to `ReviewFlow`, which owns the rest of the
 *                select -> rate -> overall -> thanks journey
 */
export default function DinerLandingPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.rpc("get_table_context", { p_code: code });
        if (cancelled) return;

        if (error) {
          setState({ status: "error" });
          return;
        }

        const context = parseTableContext(data);
        if (!context) {
          setState({ status: "invalid" });
          return;
        }

        setState({ status: "ready", context });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <EnsoLoader label="Loading your table" size={64} />
      </main>
    );
  }

  if (state.status === "invalid") {
    return (
      <main className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-6 px-6 py-12">
        <Eyebrow>Not found</Eyebrow>
        <SectionHeading as="h1" title="We can't find this table" description={INVALID_TABLE_CODE_MESSAGE} />
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-6 px-6 py-12">
        <Eyebrow>Something went wrong</Eyebrow>
        <SectionHeading as="h1" title="We couldn't load this table" description={GENERIC_ERROR_MESSAGE} />
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => {
            // Re-trigger the fetch by reloading this route.
            window.location.reload();
          }}
        >
          Try again
        </Button>
      </main>
    );
  }

  return <ReviewFlow tableCode={code} context={state.context} />;
}
