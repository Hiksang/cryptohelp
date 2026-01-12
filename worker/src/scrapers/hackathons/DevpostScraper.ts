import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { HackathonFormat, HackathonStatus } from "../../types.js";

interface DevpostHackathon {
  id: string;
  title: string;
  organization?: string;
  tagline?: string;
  url: string;
  startDate: string;
  endDate: string;
  status: string;
  prizeAmount?: string;
  format: "online" | "in-person" | "hybrid";
  location?: string;
  thumbnailUrl?: string;
  participantCount?: number;
  themes: string[];
}

export class DevpostScraper {
  private source = "devpost";
  private baseUrl = "https://devpost.com";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    const hackathons: DevpostHackathon[] = [];
    let found = 0;
    let created = 0;
    let updated = 0;
    const parseDateRange = this.parseDateRange.bind(this);

    const crawler = new PlaywrightCrawler({
      maxConcurrency: 1,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 120,

      async requestHandler({ page, request, log }) {
        log.info(`Processing ${request.url}`);

        await page.waitForLoadState("networkidle");

        // Wait for hackathon tiles to load
        await page.waitForSelector(".hackathon-tile, [data-hackathon-tile]", { timeout: 30000 }).catch(() => {
          log.warning("Hackathon tiles not found, trying alternative selectors...");
        });

        // Scroll to load more hackathons
        for (let i = 0; i < 8; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1500);
        }

        // Extract hackathon data from page
        const hackathonData = await page.evaluate(() => {
          const results: Array<{
            id: string;
            title: string;
            organization?: string;
            tagline?: string;
            url: string;
            dateText?: string;
            status: string;
            prizeAmount?: string;
            format: "online" | "in-person" | "hybrid";
            location?: string;
            thumbnailUrl?: string;
            participantCount?: number;
            themes: string[];
          }> = [];

          // Find all hackathon tiles
          const tiles = document.querySelectorAll('.hackathon-tile');

          tiles.forEach((tile) => {
            // Get hackathon link - format is subdomain.devpost.com
            const linkEl = tile.querySelector('a[href*=".devpost.com"]') as HTMLAnchorElement;
            if (!linkEl) return;

            const url = linkEl.href;
            // Extract id from subdomain format: https://gemini3.devpost.com
            const idMatch = url.match(/https?:\/\/([^.]+)\.devpost\.com/);
            if (!idMatch) return;
            const id = idMatch[1];

            // Get title
            const titleEl = tile.querySelector('h2, h3, [class*="title"], [class*="name"]');
            const title = titleEl?.textContent?.trim() || id;

            // Get organization
            const orgEl = tile.querySelector('[class*="host"], [class*="organization"], [class*="organizer"]');
            const organization = orgEl?.textContent?.trim();

            // Get tagline/description
            const taglineEl = tile.querySelector('p, [class*="tagline"], [class*="description"]');
            const tagline = taglineEl?.textContent?.trim();

            // Get dates
            const dateEl = tile.querySelector('[class*="date"], [class*="submission"], time');
            const dateText = dateEl?.textContent?.trim();

            // Get status
            const tileText = tile.textContent?.toLowerCase() || "";
            let status = "upcoming";
            if (tileText.includes("open") || tileText.includes("accepting")) {
              status = "registration_open";
            } else if (tileText.includes("ended") || tileText.includes("closed") || tileText.includes("completed")) {
              status = "completed";
            } else if (tileText.includes("ongoing") || tileText.includes("in progress")) {
              status = "ongoing";
            }

            // Get prize amount
            const prizeEl = tile.querySelector('[class*="prize"], [class*="amount"]');
            const prizeAmount = prizeEl?.textContent?.trim();

            // Get format
            let format: "online" | "in-person" | "hybrid" = "online";
            if (tileText.includes("in-person") && tileText.includes("online")) {
              format = "hybrid";
            } else if (tileText.includes("in-person") || tileText.includes("in person")) {
              format = "in-person";
            }

            // Get location
            const locationEl = tile.querySelector('[class*="location"]');
            const location = locationEl?.textContent?.trim();

            // Get thumbnail
            const imgEl = tile.querySelector('img');
            const thumbnailUrl = imgEl?.src;

            // Get participant count
            let participantCount: number | undefined;
            const participantMatch = tileText.match(/(\d[\d,]*)\s*(?:participants?|registrations?|hackers?)/i);
            if (participantMatch) {
              participantCount = parseInt(participantMatch[1].replace(/,/g, ""), 10);
            }

            // Get themes from badges/tags
            const themes: string[] = [];
            tile.querySelectorAll('[class*="tag"], [class*="theme"], [class*="category"], [class*="badge"]').forEach((tag) => {
              const text = tag.textContent?.trim();
              if (text && text.length < 50 && !text.includes("Open") && !text.includes("Ended")) {
                themes.push(text);
              }
            });

            results.push({
              id,
              title,
              organization,
              tagline,
              url,
              dateText,
              status,
              prizeAmount,
              format,
              location,
              thumbnailUrl,
              participantCount,
              themes,
            });
          });

          return results;
        });

        log.info(`Extracted ${hackathonData.length} hackathons`);

        // Filter for blockchain/web3 hackathons and parse dates
        const web3Keywords = [
          "blockchain", "web3", "crypto", "defi", "nft", "ethereum", "solana",
          "bitcoin", "smart contract", "dapp", "dao", "token", "decentralized",
          "polygon", "arbitrum", "optimism", "cosmos", "polkadot", "near", "sui",
          "aptos", "hedera", "cardano", "avalanche", "bnb", "binance"
        ];

        for (const data of hackathonData) {
          const searchText = [
            data.title,
            data.tagline,
            data.organization,
            ...data.themes
          ].filter(Boolean).join(" ").toLowerCase();

          const isWeb3 = web3Keywords.some(keyword => searchText.includes(keyword));
          if (!isWeb3) continue;

          // Parse dates
          let startDate: string;
          let endDate: string;
          const now = new Date();

          if (data.dateText) {
            const parsed = parseDateRange(data.dateText);
            if (parsed) {
              startDate = parsed.startDate;
              endDate = parsed.endDate;
            } else {
              startDate = now.toISOString();
              endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
            }
          } else {
            startDate = now.toISOString();
            endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          }

          hackathons.push({
            id: data.id,
            title: data.title,
            organization: data.organization,
            tagline: data.tagline,
            url: data.url,
            startDate,
            endDate,
            status: data.status,
            prizeAmount: data.prizeAmount,
            format: data.format,
            location: data.location,
            thumbnailUrl: data.thumbnailUrl,
            participantCount: data.participantCount,
            themes: data.themes,
          });
        }

        found = hackathons.length;
        log.info(`Filtered to ${found} blockchain/web3 hackathons`);
      },
    });

    // Scrape blockchain hackathons page
    await crawler.run([
      `${this.baseUrl}/hackathons?challenge_type[]=online&challenge_type[]=in-person&themes[]=Blockchain`,
      `${this.baseUrl}/hackathons?challenge_type[]=online&challenge_type[]=in-person&search=blockchain`,
      `${this.baseUrl}/hackathons?challenge_type[]=online&challenge_type[]=in-person&search=web3`,
    ]);

    console.log(`Devpost: Found ${hackathons.length} blockchain hackathons`);

    // Remove duplicates
    const uniqueHackathons = this.deduplicateHackathons(hackathons);
    console.log(`Devpost: ${uniqueHackathons.length} unique hackathons after deduplication`);

    // Save to database
    for (const hackathon of uniqueHackathons) {
      try {
        const result = await this.saveHackathon(hackathon);
        if (result === "created") created++;
        else if (result === "updated") updated++;
      } catch (error) {
        console.error(`Failed to save hackathon ${hackathon.title}:`, error);
      }
    }

    return { found: uniqueHackathons.length, created, updated };
  }

  private parseDateRange(dateText: string): { startDate: string; endDate: string } | null {
    const months: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5,
      jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
      oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
    };

    try {
      // Pattern: "Dec 01, 2025 - Jan 31, 2026"
      const rangeMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})\s*[-–to]+\s*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (rangeMatch) {
        const startMonth = months[rangeMatch[1].toLowerCase().substring(0, 3)];
        const startDay = parseInt(rangeMatch[2], 10);
        const startYear = parseInt(rangeMatch[3], 10);
        const endMonth = months[rangeMatch[4].toLowerCase().substring(0, 3)];
        const endDay = parseInt(rangeMatch[5], 10);
        const endYear = parseInt(rangeMatch[6], 10);

        if (startMonth !== undefined && endMonth !== undefined) {
          return {
            startDate: new Date(startYear, startMonth, startDay).toISOString(),
            endDate: new Date(endYear, endMonth, endDay).toISOString()
          };
        }
      }

      // Pattern: "Jan 15 - Feb 20, 2026" (same year)
      const sameYearMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})\s*[-–to]+\s*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (sameYearMatch) {
        const startMonth = months[sameYearMatch[1].toLowerCase().substring(0, 3)];
        const startDay = parseInt(sameYearMatch[2], 10);
        const endMonth = months[sameYearMatch[3].toLowerCase().substring(0, 3)];
        const endDay = parseInt(sameYearMatch[4], 10);
        const year = parseInt(sameYearMatch[5], 10);

        if (startMonth !== undefined && endMonth !== undefined) {
          return {
            startDate: new Date(year, startMonth, startDay).toISOString(),
            endDate: new Date(year, endMonth, endDay).toISOString()
          };
        }
      }

      // Pattern: "Jan 15 - 20, 2026" (same month)
      const sameMonthMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})\s*[-–to]+\s*(\d{1,2}),?\s*(\d{4})/i);
      if (sameMonthMatch) {
        const month = months[sameMonthMatch[1].toLowerCase().substring(0, 3)];
        const startDay = parseInt(sameMonthMatch[2], 10);
        const endDay = parseInt(sameMonthMatch[3], 10);
        const year = parseInt(sameMonthMatch[4], 10);

        if (month !== undefined) {
          return {
            startDate: new Date(year, month, startDay).toISOString(),
            endDate: new Date(year, month, endDay).toISOString()
          };
        }
      }
    } catch (error) {
      console.error(`Failed to parse date: ${dateText}`, error);
    }

    return null;
  }

  private deduplicateHackathons(hackathons: DevpostHackathon[]): DevpostHackathon[] {
    const seen = new Map<string, DevpostHackathon>();
    for (const h of hackathons) {
      if (!seen.has(h.id)) {
        seen.set(h.id, h);
      }
    }
    return Array.from(seen.values());
  }

  private async saveHackathon(
    hackathon: DevpostHackathon
  ): Promise<"created" | "updated" | "unchanged"> {
    const rawChains = this.extractChains(hackathon);
    const { chains, chainIds } = normalizeChains(rawChains);
    const prizePool = this.parsePrizePool(hackathon.prizeAmount);

    const hackathonData = {
      source: this.source,
      source_id: hackathon.id,
      slug: generateSlug(hackathon.title, this.source, hackathon.id),
      name: hackathon.title,
      description: hackathon.tagline || null,
      short_description: hackathon.tagline || null,
      start_date: hackathon.startDate,
      end_date: hackathon.endDate,
      registration_start_date: null,
      registration_end_date: null,
      timezone: null,
      format: hackathon.format,
      location: hackathon.location ? { display: hackathon.location } : null,
      prize_pool: prizePool,
      chains,
      chain_ids: chainIds,
      categories: this.extractCategories(hackathon),
      themes: hackathon.themes,
      sponsors: hackathon.organization ? [hackathon.organization] : [],
      registration_url: hackathon.url,
      website_url: hackathon.url,
      discord_url: null,
      telegram_url: null,
      twitter_url: null,
      logo_url: hackathon.thumbnailUrl || null,
      banner_url: hackathon.thumbnailUrl || null,
      participant_count: hackathon.participantCount || null,
      project_count: null,
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
      case "registration_open":
        return "registration_open";
      case "ongoing":
        return "ongoing";
      case "completed":
        return "completed";
      default:
        return "upcoming";
    }
  }

  private parsePrizePool(prizeAmount?: string): { amount: number; currency: string } | null {
    if (!prizeAmount) return null;

    const match = prizeAmount.match(/[$€£]?([\d,]+)/);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ""), 10);
      const currency = prizeAmount.includes("€") ? "EUR" :
                       prizeAmount.includes("£") ? "GBP" : "USD";
      return { amount, currency };
    }
    return null;
  }

  private extractChains(hackathon: DevpostHackathon): string[] {
    const chains: string[] = [];
    const text = [
      hackathon.title,
      hackathon.tagline,
      hackathon.organization,
      ...hackathon.themes
    ].filter(Boolean).join(" ").toLowerCase();

    const chainPatterns: Record<string, string> = {
      ethereum: "Ethereum",
      polygon: "Polygon",
      solana: "Solana",
      near: "NEAR",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
      base: "Base",
      avalanche: "Avalanche",
      bnb: "BNB Chain",
      binance: "BNB Chain",
      sui: "Sui",
      aptos: "Aptos",
      mantle: "Mantle",
      zksync: "zkSync",
      starknet: "Starknet",
      cosmos: "Cosmos",
      polkadot: "Polkadot",
      bitcoin: "Bitcoin",
      xrp: "XRP Ledger",
      algorand: "Algorand",
      tezos: "Tezos",
      hedera: "Hedera",
      cardano: "Cardano",
      flow: "Flow",
    };

    for (const [key, chain] of Object.entries(chainPatterns)) {
      if (text.includes(key) && !chains.includes(chain)) {
        chains.push(chain);
      }
    }

    if (chains.length === 0) {
      chains.push("Multi-chain");
    }

    return chains;
  }

  private extractCategories(hackathon: DevpostHackathon): string[] {
    const categoryMap: Record<string, string> = {
      defi: "defi",
      nft: "nft",
      gaming: "gaming",
      dao: "dao",
      infrastructure: "infrastructure",
      social: "social",
      privacy: "privacy",
      identity: "identity",
      payments: "payments",
      ai: "ai",
      "machine learning": "ai",
      "public goods": "public-goods",
      blockchain: "web3",
      web3: "web3",
    };

    const text = [
      hackathon.title,
      hackathon.tagline,
      ...hackathon.themes
    ].filter(Boolean).join(" ").toLowerCase();

    const categories: string[] = [];
    for (const [key, category] of Object.entries(categoryMap)) {
      if (text.includes(key) && !categories.includes(category)) {
        categories.push(category);
      }
    }

    if (categories.length === 0) {
      categories.push("web3");
    }

    return categories;
  }
}
