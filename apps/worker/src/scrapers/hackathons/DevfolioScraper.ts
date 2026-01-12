import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { HackathonFormat, HackathonStatus } from "@buidltown/shared";

interface DevfolioHackathon {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  startDate: string;
  endDate: string;
  isOnline: boolean;
  timezone?: string;
  themes?: string[];
  participantCount?: number;
  projectCount?: number;
  slug: string;
  coverImg?: string;
  logo?: string;
  registrationUrl: string;
  status: string;
}

export class DevfolioScraper {
  private source = "devfolio";
  private baseUrl = "https://devfolio.co";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    const hackathons: DevfolioHackathon[] = [];
    let found = 0;
    let created = 0;
    let updated = 0;

    const crawler = new PlaywrightCrawler({
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 120,

      async requestHandler({ page, request, log }) {
        log.info(`Processing ${request.url}`);

        await page.waitForLoadState("networkidle");

        // Wait for hackathon cards to load
        await page.waitForSelector('a[href*=".devfolio.co"]', { timeout: 30000 }).catch(() => {
          log.warning("Hackathon cards selector not found, trying alternative...");
        });

        // Scroll to load more hackathons
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1500);
        }

        // Extract hackathon data using page.evaluate
        const hackathonData = await page.evaluate(() => {
          const results: Array<{
            name: string;
            slug: string;
            tagline?: string;
            isOnline: boolean;
            status: string;
            participantCount?: number;
            coverImg?: string;
            logo?: string;
            themes?: string[];
            registrationUrl: string;
          }> = [];

          // Find all hackathon cards - they typically have links to *.devfolio.co
          const hackathonLinks = document.querySelectorAll('a[href*=".devfolio.co"]');
          const processedSlugs = new Set<string>();

          hackathonLinks.forEach((link) => {
            const href = (link as HTMLAnchorElement).href;
            if (!href || !href.includes(".devfolio.co")) return;

            // Extract slug from URL like https://hackathon-name.devfolio.co
            const match = href.match(/https?:\/\/([^.]+)\.devfolio\.co/);
            if (!match) return;

            const slug = match[1];
            if (processedSlugs.has(slug) || slug === "devfolio" || slug === "www") return;
            processedSlugs.add(slug);

            // Find the parent card container
            const card = link.closest('[class*="cursor-pointer"]') || link.parentElement?.parentElement?.parentElement;
            if (!card) return;

            // Extract name - look for h2, h3, or heading elements
            const nameEl = card.querySelector("h2, h3, h4, [class*='heading'], [class*='title']");
            const name = nameEl?.textContent?.trim() || slug.replace(/-/g, " ");

            // Extract tagline/description
            const taglineEl = card.querySelector("p");
            const tagline = taglineEl?.textContent?.trim();

            // Check if online or offline
            const cardText = card.textContent?.toLowerCase() || "";
            const isOnline = cardText.includes("online") && !cardText.includes("offline");

            // Extract status
            let status = "upcoming";
            if (cardText.includes("live") || cardText.includes("실시간")) {
              status = "ongoing";
            } else if (cardText.includes("ended") || cardText.includes("종료")) {
              status = "completed";
            } else if (cardText.includes("open")) {
              status = "registration_open";
            }

            // Extract participant count
            let participantCount: number | undefined;
            const participantMatch = cardText.match(/(\d+)\+?\s*(participant|참가|builder)/i);
            if (participantMatch) {
              participantCount = parseInt(participantMatch[1], 10);
            }

            // Extract logo/image
            const imgEl = card.querySelector("img");
            const logo = imgEl?.src;

            // Extract themes from badges
            const themes: string[] = [];
            card.querySelectorAll('[class*="badge"], [class*="tag"], [class*="chip"]').forEach((badge) => {
              const text = badge.textContent?.trim();
              if (text && !text.includes("Online") && !text.includes("Offline") && !text.includes("Open") && !text.includes("Ended")) {
                themes.push(text);
              }
            });

            results.push({
              name,
              slug,
              tagline,
              isOnline,
              status,
              participantCount,
              logo,
              themes,
              registrationUrl: href,
            });
          });

          return results;
        });

        log.info(`Extracted ${hackathonData.length} hackathons`);

        // Create hackathon objects
        for (const data of hackathonData) {
          // Skip if already exists
          if (hackathons.some(h => h.slug === data.slug)) continue;

          // Calculate dates (estimate based on status)
          const now = new Date();
          let startDate = now.toISOString();
          let endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

          if (data.status === "completed") {
            startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
            endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          } else if (data.status === "ongoing") {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          }

          hackathons.push({
            id: data.slug,
            name: data.name,
            slug: data.slug,
            tagline: data.tagline,
            isOnline: data.isOnline,
            startDate,
            endDate,
            participantCount: data.participantCount,
            logo: data.logo,
            themes: data.themes,
            registrationUrl: data.registrationUrl,
            status: data.status,
          });
        }

        found = hackathons.length;
      },
    });

    // Devfolio hackathons page
    await crawler.run([`${this.baseUrl}/hackathons`]);

    console.log(`Devfolio: Found ${hackathons.length} hackathons`);

    // Save to database
    for (const hackathon of hackathons) {
      try {
        const result = await this.saveHackathon(hackathon);
        if (result === "created") created++;
        else if (result === "updated") updated++;
      } catch (error) {
        console.error(`Failed to save hackathon ${hackathon.name}:`, error);
      }
    }

    return { found, created, updated };
  }

  private async saveHackathon(
    hackathon: DevfolioHackathon
  ): Promise<"created" | "updated" | "unchanged"> {
    // Extract chains from themes/description
    const rawChains = this.extractChains(hackathon);
    const { chains, chainIds } = normalizeChains(rawChains);

    const format: HackathonFormat = hackathon.isOnline ? "online" : "in-person";

    const hackathonData = {
      source: this.source,
      source_id: hackathon.id,
      slug: generateSlug(hackathon.name, this.source, hackathon.id),
      name: hackathon.name,
      description: hackathon.tagline || null,
      short_description: hackathon.tagline || null,
      start_date: hackathon.startDate,
      end_date: hackathon.endDate,
      registration_start_date: null,
      registration_end_date: null,
      timezone: hackathon.timezone || null,
      format,
      location: null,
      prize_pool: null,
      chains,
      chain_ids: chainIds,
      categories: this.mapThemesToCategories(hackathon.themes || []),
      themes: hackathon.themes || [],
      sponsors: [],
      registration_url: hackathon.registrationUrl,
      website_url: hackathon.registrationUrl,
      discord_url: null,
      telegram_url: null,
      twitter_url: null,
      logo_url: hackathon.logo || null,
      banner_url: hackathon.coverImg || null,
      participant_count: hackathon.participantCount || null,
      project_count: hackathon.projectCount || null,
      status: this.mapStatus(hackathon.status),
      is_official: false,
      is_featured: false,
      raw_data: hackathon as unknown as Record<string, unknown>,
      content_hash: generateContentHash(hackathon as unknown as Record<string, unknown>),
      last_scraped_at: new Date().toISOString(),
    };

    // Check if exists
    const { data: existing } = await supabase
      .from("hackathons")
      .select("id, content_hash")
      .eq("source", this.source)
      .eq("source_id", hackathon.id)
      .single();

    if (!existing) {
      await supabase.from("hackathons").insert(hackathonData);
      return "created";
    }

    if (existing.content_hash !== hackathonData.content_hash) {
      await supabase
        .from("hackathons")
        .update(hackathonData)
        .eq("id", existing.id);
      return "updated";
    }

    return "unchanged";
  }

  private mapStatus(status: string): HackathonStatus {
    switch (status) {
      case "ongoing":
        return "ongoing";
      case "completed":
        return "completed";
      case "registration_open":
        return "registration_open";
      default:
        return "upcoming";
    }
  }

  private extractChains(hackathon: DevfolioHackathon): string[] {
    const chains: string[] = [];
    const themes = hackathon.themes || [];
    const text = [hackathon.name, hackathon.tagline, ...themes].join(" ").toLowerCase();

    // Map common theme names to chains
    const chainPatterns: Record<string, string> = {
      ethereum: "Ethereum",
      eth: "Ethereum",
      polygon: "Polygon",
      matic: "Polygon",
      solana: "Solana",
      sol: "Solana",
      near: "NEAR",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
      base: "Base",
      avalanche: "Avalanche",
      avax: "Avalanche",
      bnb: "BNB Chain",
      binance: "BNB Chain",
      sui: "Sui",
      aptos: "Aptos",
      mantle: "Mantle",
      zksync: "zkSync",
      starknet: "Starknet",
      cosmos: "Cosmos",
      polkadot: "Polkadot",
    };

    for (const [key, chain] of Object.entries(chainPatterns)) {
      if (text.includes(key) && !chains.includes(chain)) {
        chains.push(chain);
      }
    }

    // Default to Multi-chain if no specific chain found
    if (chains.length === 0) {
      chains.push("Multi-chain");
    }

    return chains;
  }

  private mapThemesToCategories(themes: string[]): string[] {
    const categoryMap: Record<string, string> = {
      defi: "defi",
      "decentralized finance": "defi",
      nft: "nft",
      gaming: "gaming",
      gamefi: "gaming",
      dao: "dao",
      governance: "dao",
      infrastructure: "infrastructure",
      tooling: "infrastructure",
      social: "social",
      privacy: "privacy",
      "zero knowledge": "privacy",
      zk: "privacy",
      identity: "identity",
      payments: "payments",
      ai: "ai",
      "artificial intelligence": "ai",
      "machine learning": "ai",
      "public goods": "public-goods",
      blockchain: "web3",
    };

    const categories: string[] = [];
    for (const theme of themes) {
      const normalized = theme.toLowerCase();
      for (const [key, category] of Object.entries(categoryMap)) {
        if (normalized.includes(key) && !categories.includes(category)) {
          categories.push(category);
        }
      }
    }

    if (categories.length === 0) {
      categories.push("web3");
    }

    return categories;
  }
}
