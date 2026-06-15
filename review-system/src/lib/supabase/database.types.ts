// AUTO-GENERATED — will be overwritten from the live schema
//
// PLACEHOLDER STUB. Once the Supabase project + migrations from
// docs/IMPLEMENTATION-PLAN.md §5 / §6.5 and docs/PLAN-ADDENDUM.md §A are
// applied, regenerate this file with:
//
//   npx supabase gen types typescript --project-id <project-ref> > src/lib/supabase/database.types.ts
//
// (or via the Supabase MCP `generate_typescript_types` tool). Until then,
// this stub provides just enough shape for `client.ts` / `server.ts` to
// type-check and for feature agents to start writing against a stable
// `Database` generic.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, Json>;
        Insert: Record<string, Json>;
        Update: Record<string, Json>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, Json>;
      };
    };
    Functions: {
      // PLAN-ADDENDUM §A1/§A6 — anon writes/reads go through these RPCs only.
      // Replace with generated signatures once the schema is applied.
      start_session: {
        Args: Record<string, Json>;
        Returns: Json;
      };
      submit_review: {
        Args: Record<string, Json>;
        Returns: Json;
      };
      get_table_context: {
        Args: Record<string, Json>;
        Returns: Json;
      };
      [key: string]: {
        Args: Record<string, Json>;
        Returns: Json;
      };
    };
    Enums: {
      [key: string]: string;
    };
  };
}
