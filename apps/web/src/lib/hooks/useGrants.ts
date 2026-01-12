"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured, type Database } from "@/lib/supabase/client";

export type GrantRow = Database["public"]["Tables"]["grants"]["Row"];

export interface GrantFilters {
  status?: string[];
  chains?: string[];
  categories?: string[];
  isRolling?: boolean;
  search?: string;
}

// Mock data for development without Supabase
const MOCK_GRANTS: GrantRow[] = [
  {
    id: "1",
    source: "ethereum_foundation",
    source_id: "academic-grants-2026",
    slug: "ef-academic-grants-2026",
    foundation: { name: "Ethereum Foundation", chain: "Ethereum", logoUrl: null, websiteUrl: "https://ethereum.foundation" },
    name: "Ethereum Foundation Academic Grants",
    program_name: "Academic Grants Round",
    description: "Supporting academic research that advances the Ethereum ecosystem.",
    short_description: "Supporting academic research for Ethereum",
    funding: { minAmount: 10000, maxAmount: 100000, currency: "USD", format: "range" },
    application_deadline: "2026-03-31T23:59:59Z",
    program_start_date: "2026-01-01T00:00:00Z",
    program_end_date: "2026-12-31T23:59:59Z",
    is_rolling: false,
    categories: ["infrastructure", "research", "public-goods"],
    tracks: ["Protocol Research", "Cryptography", "Economics"],
    eligibility: { requirements: ["Academic institution affiliation"] },
    application_url: "https://ethereum.foundation/grants",
    guidelines_url: "https://ethereum.foundation/grants/guidelines",
    faq_url: null,
    logo_url: null,
    banner_url: null,
    status: "active",
    is_featured: true,
    chains: ["Ethereum"],
    chain_ids: [1],
    raw_data: null,
    content_hash: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    last_scraped_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    source: "optimism",
    source_id: "retropgf-5",
    slug: "optimism-retropgf-round-5",
    foundation: { name: "Optimism Collective", chain: "Optimism", logoUrl: null, websiteUrl: "https://optimism.io" },
    name: "Optimism RetroPGF Round 5",
    program_name: "Retroactive Public Goods Funding",
    description: "Rewarding contributors who have provided value to the Optimism ecosystem.",
    short_description: "Retroactive funding for public goods",
    funding: { totalPool: 10000000, currency: "OP", format: "milestone-based" },
    application_deadline: "2026-02-28T23:59:59Z",
    program_start_date: "2026-02-01T00:00:00Z",
    program_end_date: "2026-03-31T23:59:59Z",
    is_rolling: false,
    categories: ["public-goods", "infrastructure", "tooling"],
    tracks: ["Developer Tools", "Education", "Governance"],
    eligibility: null,
    application_url: "https://app.optimism.io/retropgf",
    guidelines_url: null,
    faq_url: null,
    logo_url: null,
    banner_url: null,
    status: "active",
    is_featured: true,
    chains: ["Optimism"],
    chain_ids: [10],
    raw_data: null,
    content_hash: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    last_scraped_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "3",
    source: "arbitrum",
    source_id: "arbitrum-grants",
    slug: "arbitrum-foundation-grants",
    foundation: { name: "Arbitrum Foundation", chain: "Arbitrum", logoUrl: null, websiteUrl: "https://arbitrum.foundation" },
    name: "Arbitrum Foundation Grants",
    program_name: "Ecosystem Development",
    description: "Supporting projects that grow the Arbitrum ecosystem.",
    short_description: "Grants for Arbitrum ecosystem growth",
    funding: { minAmount: 5000, maxAmount: 250000, currency: "USD", format: "range" },
    application_deadline: null,
    program_start_date: null,
    program_end_date: null,
    is_rolling: true,
    categories: ["defi", "gaming", "infrastructure", "tooling"],
    tracks: [],
    eligibility: null,
    application_url: "https://arbitrum.foundation/grants",
    guidelines_url: null,
    faq_url: null,
    logo_url: null,
    banner_url: null,
    status: "active",
    is_featured: false,
    chains: ["Arbitrum"],
    chain_ids: [42161],
    raw_data: null,
    content_hash: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    last_scraped_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "4",
    source: "polygon",
    source_id: "polygon-village",
    slug: "polygon-village-grants",
    foundation: { name: "Polygon Labs", chain: "Polygon", logoUrl: null, websiteUrl: "https://polygon.technology" },
    name: "Polygon Village Grants",
    program_name: "Village Accelerator",
    description: "Accelerating the next generation of Web3 builders on Polygon.",
    short_description: "Accelerator program for Polygon builders",
    funding: { typicalAmount: 50000, currency: "USD", format: "fixed" },
    application_deadline: null,
    program_start_date: null,
    program_end_date: null,
    is_rolling: true,
    categories: ["defi", "nft", "gaming", "social"],
    tracks: ["DeFi", "Gaming", "Social"],
    eligibility: null,
    application_url: "https://polygon.technology/village",
    guidelines_url: null,
    faq_url: null,
    logo_url: null,
    banner_url: null,
    status: "active",
    is_featured: false,
    chains: ["Polygon"],
    chain_ids: [137],
    raw_data: null,
    content_hash: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    last_scraped_at: "2025-01-01T00:00:00Z",
  },
];

async function fetchGrants(filters?: GrantFilters): Promise<GrantRow[]> {
  // Return mock data if Supabase is not configured
  if (!isSupabaseConfigured || !supabase) {
    let data = [...MOCK_GRANTS];

    if (filters?.status && filters.status.length > 0) {
      data = data.filter((g) => filters.status!.includes(g.status));
    }

    if (filters?.chains && filters.chains.length > 0) {
      data = data.filter((g) => g.chains.some((c) => filters.chains!.includes(c)));
    }

    if (filters?.categories && filters.categories.length > 0) {
      data = data.filter((g) => g.categories.some((c) => filters.categories!.includes(c)));
    }

    if (filters?.isRolling !== undefined) {
      data = data.filter((g) => g.is_rolling === filters.isRolling);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      data = data.filter(
        (g) =>
          g.name.toLowerCase().includes(search) ||
          g.description?.toLowerCase().includes(search)
      );
    }

    // Sort: active first, then by deadline (nulls last)
    return data.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      if (!a.application_deadline) return 1;
      if (!b.application_deadline) return -1;
      return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime();
    });
  }

  let query = supabase
    .from("grants")
    .select("*")
    .order("application_deadline", { ascending: true, nullsFirst: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters?.chains && filters.chains.length > 0) {
    query = query.overlaps("chains", filters.chains);
  }

  // Note: categories filter is handled client-side for case-insensitive matching
  // if (filters?.categories && filters.categories.length > 0) {
  //   query = query.overlaps("categories", filters.categories);
  // }

  if (filters?.isRolling !== undefined) {
    query = query.eq("is_rolling", filters.isRolling);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let result = data ?? [];

  // Client-side case-insensitive category filtering
  if (filters?.categories && filters.categories.length > 0) {
    const lowerCaseFilters = filters.categories.map((c) => c.toLowerCase());
    result = result.filter((g) =>
      g.categories.some((c: string) => lowerCaseFilters.includes(c.toLowerCase()))
    );
  }

  return result;
}

export function useGrants(filters?: GrantFilters) {
  return useQuery({
    queryKey: ["grants", filters],
    queryFn: () => fetchGrants(filters),
  });
}

// Fetch single grant by slug
async function fetchGrantBySlug(slug: string): Promise<GrantRow | null> {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_GRANTS.find((g) => g.slug === slug) ?? null;
  }

  const { data, error } = await supabase
    .from("grants")
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

export function useGrant(slug: string) {
  return useQuery({
    queryKey: ["grant", slug],
    queryFn: () => fetchGrantBySlug(slug),
    enabled: !!slug,
  });
}

// Export mock data for use in other places if needed
export { MOCK_GRANTS };
