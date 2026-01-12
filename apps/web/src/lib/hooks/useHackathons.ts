"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured, type Database } from "@/lib/supabase/client";

export type HackathonRow = Database["public"]["Tables"]["hackathons"]["Row"];

export interface HackathonFilters {
  status?: string[];
  format?: string[];
  chains?: string[];
  search?: string;
}

// Priority order for hackathon status (lower number = higher priority)
const STATUS_PRIORITY: Record<string, number> = {
  ongoing: 0,
  registration_open: 1,
  upcoming: 2,
  judging: 3,
  completed: 4,
};

// Sort hackathons: ongoing first, then by status priority, then by start date
function sortHackathonsByPriority(hackathons: HackathonRow[]): HackathonRow[] {
  return hackathons.sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] ?? 5;
    const priorityB = STATUS_PRIORITY[b.status] ?? 5;

    // First sort by status priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // For same status, sort by start date (earlier first for upcoming, later first for completed)
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();

    // For completed hackathons, show most recent first
    if (a.status === "completed") {
      return dateB - dateA;
    }

    // For other statuses, show earliest first
    return dateA - dateB;
  });
}

// Mock data for development without Supabase
const MOCK_HACKATHONS: HackathonRow[] = [
  {
    id: "1",
    source: "ethglobal",
    source_id: "bangkok-2026",
    slug: "ethglobal-bangkok-2026",
    name: "ETHGlobal Bangkok",
    description: "Join us in Bangkok for an exciting weekend of hacking and building the future of Web3.",
    short_description: "Build the future of Web3 in Bangkok",
    start_date: "2026-01-15T00:00:00Z",
    end_date: "2026-01-17T23:59:59Z",
    registration_start_date: "2025-12-01T00:00:00Z",
    registration_end_date: "2026-01-14T23:59:59Z",
    timezone: "Asia/Bangkok",
    format: "in-person",
    location: { city: "Bangkok", country: "Thailand", venue: "True Digital Park" },
    prize_pool: { amount: 750000, currency: "USD" },
    chains: ["Ethereum", "Polygon", "Arbitrum", "Optimism"],
    chain_ids: [1, 137, 42161, 10],
    categories: ["defi", "infrastructure", "social"],
    themes: ["Account Abstraction", "ZK Proofs"],
    sponsors: [],
    registration_url: "https://ethglobal.com/events/bangkok",
    website_url: "https://ethglobal.com/events/bangkok",
    discord_url: "https://discord.gg/ethglobal",
    telegram_url: null,
    twitter_url: "https://twitter.com/ethglobal",
    logo_url: "https://ethglobal.com/logo.png",
    banner_url: null,
    participant_count: 1500,
    project_count: null,
    status: "registration_open",
    is_official: true,
    is_featured: true,
    raw_data: null,
    content_hash: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    last_scraped_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    source: "devfolio",
    source_id: "solana-hyperdrive",
    slug: "solana-hyperdrive-2026",
    name: "Solana Hyperdrive",
    description: "The largest online Solana hackathon with $1M in prizes.",
    short_description: "Build the next big thing on Solana",
    start_date: "2026-01-20T00:00:00Z",
    end_date: "2026-02-15T23:59:59Z",
    registration_start_date: null,
    registration_end_date: null,
    timezone: "UTC",
    format: "online",
    location: null,
    prize_pool: { amount: 1000000, currency: "USD" },
    chains: ["Solana"],
    chain_ids: [],
    categories: ["defi", "gaming", "nft"],
    themes: [],
    sponsors: [],
    registration_url: "https://solana.com/hyperdrive",
    website_url: "https://solana.com/hyperdrive",
    discord_url: null,
    telegram_url: null,
    twitter_url: null,
    logo_url: null,
    banner_url: null,
    participant_count: 5000,
    project_count: 800,
    status: "upcoming",
    is_official: true,
    is_featured: true,
    raw_data: null,
    content_hash: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    last_scraped_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "3",
    source: "dorahacks",
    source_id: "buidl-asia-2026",
    slug: "dorahacks-buidl-asia-2026",
    name: "DoraHacks BUIDL Asia",
    description: "Asia's premier Web3 hackathon bringing together builders from across the continent.",
    short_description: "Asia's premier Web3 hackathon",
    start_date: "2026-02-05T00:00:00Z",
    end_date: "2026-02-07T23:59:59Z",
    registration_start_date: null,
    registration_end_date: null,
    timezone: "Asia/Singapore",
    format: "hybrid",
    location: { city: "Singapore", country: "Singapore" },
    prize_pool: { amount: 500000, currency: "USD" },
    chains: ["Ethereum", "BNB Chain", "Polygon"],
    chain_ids: [1, 56, 137],
    categories: ["dao", "social", "gaming"],
    themes: [],
    sponsors: [],
    registration_url: "https://dorahacks.io/buidl-asia",
    website_url: "https://dorahacks.io/buidl-asia",
    discord_url: null,
    telegram_url: null,
    twitter_url: null,
    logo_url: null,
    banner_url: null,
    participant_count: 800,
    project_count: null,
    status: "upcoming",
    is_official: false,
    is_featured: false,
    raw_data: null,
    content_hash: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    last_scraped_at: "2025-01-01T00:00:00Z",
  },
];

async function fetchHackathons(filters?: HackathonFilters): Promise<HackathonRow[]> {
  // Return mock data if Supabase is not configured
  if (!isSupabaseConfigured || !supabase) {
    let data = [...MOCK_HACKATHONS];

    if (filters?.status && filters.status.length > 0) {
      data = data.filter((h) => filters.status!.includes(h.status));
    }

    if (filters?.format && filters.format.length > 0) {
      data = data.filter((h) => filters.format!.includes(h.format));
    }

    if (filters?.chains && filters.chains.length > 0) {
      data = data.filter((h) => h.chains.some((c) => filters.chains!.includes(c)));
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      data = data.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.description?.toLowerCase().includes(search)
      );
    }

    return sortHackathonsByPriority(data);
  }

  let query = supabase
    .from("hackathons")
    .select("*");

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters?.format && filters.format.length > 0) {
    query = query.in("format", filters.format);
  }

  if (filters?.chains && filters.chains.length > 0) {
    query = query.overlaps("chains", filters.chains);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return sortHackathonsByPriority(data ?? []);
}

export function useHackathons(filters?: HackathonFilters) {
  return useQuery({
    queryKey: ["hackathons", filters],
    queryFn: () => fetchHackathons(filters),
  });
}

// Fetch single hackathon by slug
async function fetchHackathonBySlug(slug: string): Promise<HackathonRow | null> {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_HACKATHONS.find((h) => h.slug === slug) ?? null;
  }

  const { data, error } = await supabase
    .from("hackathons")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(error.message);
  }

  return data;
}

export function useHackathon(slug: string) {
  return useQuery({
    queryKey: ["hackathon", slug],
    queryFn: () => fetchHackathonBySlug(slug),
    enabled: !!slug,
  });
}

// Export mock data for use in other places if needed
export { MOCK_HACKATHONS };
