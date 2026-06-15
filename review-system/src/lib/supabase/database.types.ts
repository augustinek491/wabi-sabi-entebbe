// AUTO-GENERATED from the live Supabase schema (project ref lhiomhjkhpfmdtkbfocw).
// Regenerate after any migration via the Supabase MCP `generate_typescript_types`
// or: npx supabase gen types typescript --project-id lhiomhjkhpfmdtkbfocw

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      menu_categories: {
        Row: { id: string; name: string; slug: string; sort_order: number }
        Insert: { id?: string; name: string; slug: string; sort_order?: number }
        Update: { id?: string; name?: string; slug?: string; sort_order?: number }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_display: string | null
          sort_order: number
          variants: Json
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_display?: string | null
          sort_order?: number
          variants?: Json
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_display?: string | null
          sort_order?: number
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          reason: string | null
          target_session_id: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          id?: string
          reason?: string | null
          target_session_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_session_id?: string | null
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: { code: string; created_at: string; id: string; is_active: boolean; label: string }
        Insert: { code: string; created_at?: string; id?: string; is_active?: boolean; label: string }
        Update: { code?: string; created_at?: string; id?: string; is_active?: boolean; label?: string }
        Relationships: []
      }
      review_dish_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          menu_item_id: string
          rating: number
          session_id: string
          tags: string[]
          variant: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          menu_item_id: string
          rating: number
          session_id: string
          tags?: string[]
          variant?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          menu_item_id?: string
          rating?: number
          session_id?: string
          tags?: string[]
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_dish_ratings_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "dish_rating_summary"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "review_dish_ratings_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_dish_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "review_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_sessions: {
        Row: {
          created_at: string
          id: string
          is_low_effort: boolean
          submitted_at: string | null
          table_id: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_low_effort?: boolean
          submitted_at?: string | null
          table_id?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_low_effort?: boolean
          submitted_at?: string | null
          table_id?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: { comment: string | null; created_at: string; id: string; overall_rating: number; session_id: string }
        Insert: { comment?: string | null; created_at?: string; id?: string; overall_rating: number; session_id: string }
        Update: { comment?: string | null; created_at?: string; id?: string; overall_rating?: number; session_id?: string }
        Relationships: [
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "review_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dish_rating_summary: {
        Row: {
          avg_rating: number | null
          category_id: string | null
          menu_item_id: string | null
          name: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_rating_trend: {
        Row: { avg_overall: number | null; day: string | null; review_count: number | null }
        Relationships: []
      }
    }
    Functions: {
      get_table_context: { Args: { p_code: string }; Returns: Json }
      start_session: { Args: { p_code: string }; Returns: string }
      submit_review: {
        Args: {
          p_comment: string
          p_dishes: Json
          p_overall: number
          p_session_id: string
          p_time_spent: number
        }
        Returns: Json
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Views<T extends keyof DefaultSchema["Views"]> = DefaultSchema["Views"][T]["Row"]
