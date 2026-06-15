/**
 * Browser (anon) Supabase client — Wabi-Sabi Entebbe review system.
 *
 * Uses the PUBLIC anon key. Safe to import from client components.
 *
 * Per PLAN §3.2 / §9.2 and PLAN-ADDENDUM §A1/§A3, the anon role has:
 *   - read access to active menu/table data ONLY via `get_table_context`
 *     and direct reads of `menu_categories` / `menu_items` (public, RLS-gated)
 *   - NO direct INSERT on `reviews` / `review_dish_ratings` / `review_sessions`
 *   - NO read access to `reviews`, `review_dish_ratings`, `review_sessions`,
 *     or any aggregate view
 *
 * All diner-side writes happen by calling `start_session()` and
 * `submit_review()` (both SECURITY DEFINER RPCs) via this client's
 * `.rpc()` method — never via `.from(...).insert(...)` on the protected
 * tables. This file does not enforce that at the type level (the
 * database.types.ts stub is intentionally loose), but it is the contract:
 * do not add `.from('reviews')` / `.from('review_sessions')` /
 * `.from('review_dish_ratings')` writes anywhere that uses this client.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Returns a singleton Supabase client configured with the public anon key.
 * Use for: menu reads (`menu_categories`, `menu_items`), and calling the
 * `start_session` / `submit_review` / `get_table_context` RPCs.
 */
export function createBrowserClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Check .env.local (see .env.example)."
    );
  }

  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return browserClient;
}
