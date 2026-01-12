import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create client only if configured, otherwise null
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type Database = {
  public: {
    Tables: {
      hackathons: {
        Row: {
          id: string;
          source: string;
          source_id: string;
          slug: string;
          name: string;
          description: string | null;
          short_description: string | null;
          start_date: string;
          end_date: string;
          registration_start_date: string | null;
          registration_end_date: string | null;
          timezone: string | null;
          format: "online" | "in-person" | "hybrid";
          location: Record<string, unknown> | null;
          prize_pool: Record<string, unknown> | null;
          chains: string[];
          chain_ids: number[];
          categories: string[];
          themes: string[];
          sponsors: Record<string, unknown>[];
          registration_url: string;
          website_url: string | null;
          discord_url: string | null;
          telegram_url: string | null;
          twitter_url: string | null;
          logo_url: string | null;
          banner_url: string | null;
          participant_count: number | null;
          project_count: number | null;
          status: string;
          is_official: boolean;
          is_featured: boolean;
          raw_data: Record<string, unknown> | null;
          content_hash: string | null;
          created_at: string;
          updated_at: string;
          last_scraped_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["hackathons"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["hackathons"]["Insert"]>;
      };
      grants: {
        Row: {
          id: string;
          source: string;
          source_id: string;
          slug: string;
          foundation: Record<string, unknown>;
          name: string;
          program_name: string | null;
          description: string | null;
          short_description: string | null;
          funding: Record<string, unknown> | null;
          application_deadline: string | null;
          program_start_date: string | null;
          program_end_date: string | null;
          is_rolling: boolean;
          categories: string[];
          tracks: string[];
          eligibility: Record<string, unknown> | null;
          application_url: string;
          guidelines_url: string | null;
          faq_url: string | null;
          logo_url: string | null;
          banner_url: string | null;
          status: string;
          is_featured: boolean;
          chains: string[];
          chain_ids: number[];
          raw_data: Record<string, unknown> | null;
          content_hash: string | null;
          created_at: string;
          updated_at: string;
          last_scraped_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["grants"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["grants"]["Insert"]>;
      };
      chains: {
        Row: {
          id: number;
          chain_id: number | null;
          caip2: string | null;
          name: string;
          symbol: string;
          type: string;
          evm_compatible: boolean;
          logo_url: string | null;
          explorer_url: string | null;
          website_url: string | null;
          aliases: string[];
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
