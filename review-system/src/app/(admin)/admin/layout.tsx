import Link from "next/link";
import { Eyebrow } from "@/components/ui";
import { BRAND_NAME } from "@/lib/constants";

/**
 * `/admin` layout — admin nav shell + THE FUTURE-AUTH INSERTION POINT.
 *
 * Per docs/PLAN-ADDENDUM.md (v1.2 build decisions): admin auth is DEFERRED
 * (not yet sold to client). Integrity is preserved because the anon (diner)
 * role cannot read review data or aggregates regardless of admin auth state
 * (enforced at the DB/RLS layer — see src/lib/supabase/client.ts and
 * src/lib/supabase/server.ts).
 *
 * `ADMIN_AUTH_ENABLED` is the flag this layout will branch on once auth is
 * implemented:
 *
 *   - `false` (current): no-op. Anyone who can reach `/admin` sees the
 *     dashboard, which reads via the server-side service-role client
 *     (src/lib/supabase/server.ts) — NEVER shipped to the browser.
 *   - `true` (future): this layout should call `supabase.auth.getUser()`
 *     via an authenticated server client (PLAN §6.6), redirect to
 *     `/admin/login` if there's no session, and verify the user against
 *     `admin_profiles` (the `is_admin()` check, PLAN §5.3) before rendering
 *     `children`.
 *
 * TODO(admin-auth): when ADMIN_AUTH_ENABLED=true, add the
 * supabase.auth.getUser() guard + redirect described above, and add
 * `/admin/login` (PLAN §6.1, §6.6). Until then:
 *
 *   !! BEFORE ANY PUBLIC DEPLOY, ADD A GATE (Supabase Auth or a Vercel
 *   !! password) SO /admin IS NOT WORLD-READABLE. !!
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminAuthEnabled = process.env.ADMIN_AUTH_ENABLED === "true";

  // TODO(admin-auth): replace this no-op with the auth guard described
  // above once ADMIN_AUTH_ENABLED is true. Currently this branch exists
  // only to make the insertion point explicit and to avoid an unused-var
  // lint warning.
  if (adminAuthEnabled) {
    // Auth guard not yet implemented — see TODO above.
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="relative overflow-hidden border-b border-border bg-surface">
        {/* Seigaiha wave pattern at 4% — brand texture without distraction */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "url(/brand/brand-seigaiha.jpg)",
            backgroundSize: "80px 80px",
            backgroundRepeat: "repeat",
            opacity: 0.04,
          }}
        />
        <div className="relative mx-auto flex max-w-container items-center justify-between px-6 py-4 sm:px-10">
          <span className="font-display text-lg tracking-tight">{BRAND_NAME} — Admin</span>
          <nav
            aria-label="Admin sections"
            className="flex items-center gap-6 font-sans text-sm uppercase tracking-wide text-ink-muted"
          >
            <Link
              href="/admin"
              className="ws-eyebrow text-ink-muted transition-colors duration-200 ease-calm hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded-sm"
            >
              Overview
            </Link>
            <Link
              href="/admin/dishes"
              className="ws-eyebrow text-ink-muted transition-colors duration-200 ease-calm hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded-sm"
            >
              Dishes
            </Link>
            {/* Integrity / Export / Settings: out of scope for this build
                (PLAN §4.1 routes not yet implemented) — left as inert
                labels rather than dead links. */}
            <Eyebrow className="text-ink-subtle opacity-60">Integrity</Eyebrow>
            <Eyebrow className="text-ink-subtle opacity-60">Export</Eyebrow>
            <Eyebrow className="text-ink-subtle opacity-60">Settings</Eyebrow>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-container px-6 py-10 sm:px-10">{children}</div>
    </div>
  );
}
