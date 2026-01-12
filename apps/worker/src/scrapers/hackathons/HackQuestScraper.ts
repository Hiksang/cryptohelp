import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { HackathonFormat, HackathonStatus } from "@buidltown/shared";

interface HackQuestHackathon {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  format: "online" | "in-person" | "hybrid";
  prizePool?: string;
  participantCount?: number;
  chains?: string[];
  tags?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  registrationUrl: string;
  organizer?: string;
  status: string;
}

export class HackQuestScraper {
  private source = "hackquest";
  private baseUrl = "https://www.hackquest.io";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    const hackathons: HackQuestHackathon[] = [];
    let found = 0;
    let created = 0;
    let updated = 0;
    const extractChainsFromTags = this.extractChainsFromTags.bind(this);

    const crawler = new PlaywrightCrawler({
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 120,

      async requestHandler({ page, request, log }) {
        log.info(`Processing ${request.url}`);

        await page.waitForLoadState("networkidle");

        // Wait for hackathon cards to load - look for links to hackathon pages
        await page.waitForSelector('a[href*="/hackathons/"]', { timeout: 30000 }).catch(() => {
          log.warning("Hackathon cards not found");
        });

        // Scroll to load more hackathons
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1500);
        }

        // Extract hackathon data using page.evaluate
        const hackathonData = await page.evaluate(() => {
          const results: Array<{
            id: string;
            name: string;
            description?: string;
            prizePool?: string;
            participantCount?: number;
            logoUrl?: string;
            format: string;
            status: string;
            registrationUrl: string;
          }> = [];

          // Find all hackathon card links
          const hackathonLinks = document.querySelectorAll('a[href*="/hackathons/"]');
          const processedIds = new Set<string>();

          hackathonLinks.forEach((link) => {
            const href = (link as HTMLAnchorElement).href;
            if (!href) return;

            // Extract slug from URL like /ko/hackathons/Mantle-Global-Hackathon-2025
            const slugMatch = href.match(/\/hackathons\/([^/?]+)/);
            if (!slugMatch) return;

            const slug = slugMatch[1];
            // Skip if already processed or if it's the hackathons listing page itself
            if (processedIds.has(slug) || slug === "hackathons" || slug.length < 3) return;
            processedIds.add(slug);

            // The link element IS the card - it contains all the hackathon info
            const card = link as HTMLElement;
            const cardText = card.textContent || "";

            // Extract name from h2 heading inside the card
            const h2El = card.querySelector("h2");
            const name = h2El?.textContent?.trim();

            if (!name || name.length < 3) return;

            // Extract description from first paragraph
            const pEl = card.querySelector("p");
            const description = pEl?.textContent?.trim();

            // Extract prize pool - look for pattern like "150,000 USD"
            let prizePool: string | undefined;
            const prizeMatch = cardText.match(/([\d,]+)\s*USD/i);
            if (prizeMatch) {
              prizePool = `${prizeMatch[1]} USD`;
            }

            // Extract participant count - look for pattern like "1922+ 참가자" or "1922+ participants"
            let participantCount: number | undefined;
            const participantMatch = cardText.match(/([\d,]+)\+?\s*(참가자|participants?|builders?)/i);
            if (participantMatch) {
              participantCount = parseInt(participantMatch[1].replace(/,/g, ""), 10);
            }

            // Extract logo/image
            const imgEl = card.querySelector("img");
            const logoUrl = imgEl?.src;

            // Determine format - look for ONLINE, HYBRID, IN-PERSON badges
            let format = "online";
            if (cardText.includes("HYBRID")) {
              format = "hybrid";
            } else if (cardText.includes("IN-PERSON") || cardText.includes("OFFLINE")) {
              format = "in-person";
            }

            // Determine status from Korean/English status badges
            let status = "upcoming";
            if (cardText.includes("실시간") || cardText.includes("Live") || cardText.includes("live")) {
              status = "ongoing";
            } else if (cardText.includes("종료됨") || cardText.includes("Ended") || cardText.includes("ended")) {
              status = "completed";
            } else if (cardText.includes("투표") || cardText.includes("Voting") || cardText.includes("voting")) {
              status = "ongoing"; // Voting phase is still ongoing
            } else if (cardText.includes("다가오는") || cardText.includes("Upcoming") || cardText.includes("upcoming")) {
              status = "upcoming";
            } else if (cardText.includes("등록") || cardText.includes("Register") || cardText.includes("Open")) {
              status = "registration_open";
            }

            // Build clean registration URL (remove language prefix)
            const cleanUrl = href.replace(/\/(ko|en|zh|ja)\//, "/");

            results.push({
              id: slug,
              name,
              description,
              prizePool,
              participantCount,
              logoUrl,
              format,
              status,
              registrationUrl: cleanUrl,
            });
          });

          return results;
        });

        log.info(`Extracted ${hackathonData.length} hackathons from ${request.url}`);

        // Create hackathon objects
        const now = new Date();
        for (const data of hackathonData) {
          if (hackathons.some((h) => h.id === data.id)) continue;

          // Estimate dates based on status
          let startDate = now.toISOString();
          let endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

          if (data.status === "completed") {
            startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
            endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          } else if (data.status === "ongoing") {
            startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
            endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
          }

          // Extract chains from name and description
          const textForChains = [data.name, data.description || ""].join(" ");
          const chains = extractChainsFromTags([textForChains]);

          hackathons.push({
            id: data.id,
            name: data.name,
            description: data.description,
            startDate,
            endDate,
            format: data.format as "online" | "in-person" | "hybrid",
            prizePool: data.prizePool,
            participantCount: data.participantCount,
            chains,
            tags: [],
            logoUrl: data.logoUrl,
            registrationUrl: data.registrationUrl,
            status: data.status,
          });
        }

        found = hackathons.length;
      },
    });

    // Run on HackQuest hackathons page (English version for consistency)
    await crawler.run([`${this.baseUrl}/en/hackathons`]);

    console.log(`HackQuest: Found ${hackathons.length} hackathons`);

    for (const hackathon of hackathons) {
      try {
        const result = await this.saveHackathon(hackathon);
        if (result === "created") created++;
        else if (result === "updated") updated++;
      } catch (error) {
        console.error(`Failed to save hackathon ${hackathon.name}:`, error);
      }
    }

    return { found: hackathons.length, created, updated };
  }

  private extractChainsFromTags(tags: string[]): string[] {
    const chainMap: Record<string, string> = {
      ethereum: "Ethereum",
      eth: "Ethereum",
      polygon: "Polygon",
      solana: "Solana",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
      base: "Base",
      avalanche: "Avalanche",
      bnb: "BNB Chain",
      sui: "Sui",
      aptos: "Aptos",
      mantle: "Mantle",
      linea: "Linea",
      scroll: "Scroll",
      zksync: "zkSync",
      starknet: "Starknet",
      near: "NEAR",
      cosmos: "Cosmos",
      polkadot: "Polkadot",
      ton: "TON",
      sei: "Sei",
      monad: "Monad",
      bittensor: "Bittensor",
      metamask: "Ethereum",
    };

    const chains: string[] = [];
    for (const tag of tags) {
      const normalized = tag.toLowerCase();
      for (const [key, chain] of Object.entries(chainMap)) {
        if (normalized.includes(key) && !chains.includes(chain)) {
          chains.push(chain);
        }
      }
    }

    return chains.length > 0 ? chains : ["Multi-chain"];
  }

  private async saveHackathon(hackathon: HackQuestHackathon): Promise<"created" | "updated" | "unchanged"> {
    const { chains, chainIds } = normalizeChains(hackathon.chains || ["Multi-chain"]);

    const categories = this.mapTagsToCategories([hackathon.name, hackathon.description || ""]);

    const hackathonData = {
      source: this.source,
      source_id: hackathon.id,
      slug: generateSlug(hackathon.name, this.source, hackathon.id),
      name: hackathon.name,
      description: hackathon.description || null,
      short_description: null,
      start_date: hackathon.startDate,
      end_date: hackathon.endDate,
      registration_start_date: null,
      registration_end_date: null,
      timezone: null,
      format: hackathon.format as HackathonFormat,
      location: null,
      prize_pool: hackathon.prizePool ? { amount: hackathon.prizePool, currency: "USD" } : null,
      chains,
      chain_ids: chainIds,
      categories,
      themes: hackathon.tags || [],
      sponsors: hackathon.organizer ? [hackathon.organizer] : [],
      registration_url: hackathon.registrationUrl,
      website_url: hackathon.registrationUrl,
      discord_url: null,
      telegram_url: null,
      twitter_url: null,
      logo_url: hackathon.logoUrl || null,
      banner_url: hackathon.bannerUrl || null,
      participant_count: hackathon.participantCount || null,
      project_count: null,
      status: this.mapStatus(hackathon.status),
      is_official: false,
      is_featured: false,
      raw_data: hackathon as unknown as Record<string, unknown>,
      content_hash: generateContentHash(hackathon as unknown as Record<string, unknown>),
      last_scraped_at: new Date().toISOString(),
    };

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

  private mapTagsToCategories(texts: string[]): string[] {
    const categoryMap: Record<string, string> = {
      defi: "defi",
      nft: "nft",
      gaming: "gaming",
      dao: "dao",
      infrastructure: "infrastructure",
      social: "social",
      privacy: "privacy",
      zk: "privacy",
      "zero-knowledge": "privacy",
      ai: "ai",
      "machine learning": "ai",
      depin: "infrastructure",
      rwa: "defi",
      education: "education",
      developer: "infrastructure",
    };

    const categories: string[] = [];
    for (const text of texts) {
      const normalized = text.toLowerCase();
      for (const [key, category] of Object.entries(categoryMap)) {
        if (normalized.includes(key) && !categories.includes(category)) {
          categories.push(category);
        }
      }
    }

    return categories.length > 0 ? categories : ["web3"];
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
}
