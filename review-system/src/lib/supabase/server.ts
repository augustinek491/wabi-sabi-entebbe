/**
 * Server-only (service-role) Supabase client — Wabi-Sabi Entebbe review system.
 *
 * !! NEVER import this file from a client component or anything that ships
 * !! to the browser. The `server-only` import below makes any such import
 * !! a build-time error.
 *
 * Uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses Row-Level Security
 * entirely. Per PLAN §6.3 #3 and PLAN-ADDENDUM (v1.2 build decisions), this
 * client is used for:
 *   - `/admin/*` server components and route handlers (admin dashboard reads)
 *   - the atomic `submit_review` RPC call from the diner submission endpoint
 *   - `GET /api/admin/export` (bulk CSV reads)
 *   - the `analyze-sentiment` / moderation Edge Functions (if implemented
 *     outside Next.js, this factory is not used there — Deno has its own
 *     Supabase client — but the env var contract is the same)
 *
 * Admin auth is DEFERRED (PLAN-ADDENDUM v1.2): until `ADMIN_AUTH_ENABLED`
 * is wired up, anything under `(admin)` that uses this client is reading
 * with full privileges and NO per-request authorization check. Do not
 * expose this client's results to unauthenticated users once a public
 * deploy happens — see `src/app/(admin)/admin/layout.tsx` for the
 * future-auth insertion point.
 */

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serviceClient: SupabaseClient<Database> | undefined;

/**
 * Returns a singleton Supabase client configured with the service-role key.
 * Server-only — bypasses RLS. Do not call from client components.
 */
export function createServiceClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Check .env.local (see .env.example). The service-role key must " +
        "never be set with a NEXT_PUBLIC_ prefix."
    );
  }

  if (!serviceClient) {
    serviceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serviceClient;
}
