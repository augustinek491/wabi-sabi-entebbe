import { EnsoLoader } from "@/components/ui";

/**
 * `/r/[code]` route-level loading state (PLAN §4.2 — "brand mark + ensō
 * micro-animation while table/menu context resolves").
 *
 * Next.js renders this immediately on navigation, before the client
 * component in `page.tsx` mounts and kicks off `get_table_context(code)`.
 * Kept minimal and calm — the `EnsoLoader` primitive is static by design
 * (no spinners), matching the brief's restraint requirement.
 */
export default function DinerLandingLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <EnsoLoader label="Loading your table" size={64} />
    </main>
  );
}
