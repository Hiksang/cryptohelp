import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { HackathonFormat, HackathonStatus } from "@buidltown/shared";

interface AkindoHackathon {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
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
  type: "hackathon" | "buildathon";
}

export class AkindoScraper {
  private source = "akindo";
  private baseUrl = "https://app.akindo.io";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    const hackathons: AkindoHackathon[] = [];
    let found = 0;
    let created = 0;
    let updated = 0;
    const baseUrl = this.baseUrl;
    const extractChainsFromTags = this.extractChainsFromTags.bind(this);

    const crawler = new PlaywrightCrawler({
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 120,

      async requestHandler({ page, request, log }) {
        log.info(`Processing ${request.url}`);

        await page.waitForLoadState("networkidle");

        // Determine if this is buildathons or hackathons page
        const isBuildathons = request.url.includes("/wave-hacks");
        const type: "buildathon" | "hackathon" = isBuildathons ? "buildathon" : "hackathon";

        // Wait for cards to load
        await page.waitForSelector('a[href*="/wave-hacks/"], a[href*="/hackathons/"]', { timeout: 30000 }).catch(() => {
          log.warning("Cards not found with expected selectors");
        });

        // Scroll to load more
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1500);
        }

        // Extract hackathon data using page.evaluate
        const hackathonData = await page.evaluate((pageType: string) => {
          const results: Array<{
            id: string;
            name: string;
            description?: string;
            prizePool?: string;
            participantCount?: number;
            logoUrl?: string;
            organizer?: string;
            tags?: string[];
            status: string;
            registrationUrl: string;
            type: string;
          }> = [];

          // Find all hackathon/buildathon cards
          const selector = pageType === "buildathon"
            ? 'a[href*="/wave-hacks/"]'
            : 'a[href*="/hackathons/"]';

          const cards = document.querySelectorAll(selector);
          const processedIds = new Set<string>();

          cards.forEach((card) => {
            const href = (card as HTMLAnchorElement).href;
            if (!href) return;

            // Extract ID from URL
            const idMatch = href.match(/\/(wave-hacks|hackathons)\/([^/?]+)/);
            if (!idMatch) return;

            const id = idMatch[2];
            if (processedIds.has(id)) return;
            processedIds.add(id);

            // Find parent card container
            const cardContainer = card.closest('a') || card;
            const cardText = cardContainer.textContent || "";

            // Extract name
            const nameEl = cardContainer.querySelector("h2, h3, h4, [class*='title'], [class*='heading']");
            let name = nameEl?.textContent?.trim() || "";

            // If no name found, try different approaches
            if (!name) {
              const textNodes = cardContainer.querySelectorAll("div");
              for (const node of textNodes) {
                const text = node.textContent?.trim();
                if (text && text.length > 5 && text.length < 100 && !text.includes("$") && !text.includes("USDC") && !text.includes("USDT")) {
                  name = text;
                  break;
                }
              }
            }

            if (!name || name.length < 3) return;

            // Extract description
            const descEl = cardContainer.querySelector("p, [class*='description']");
            const description = descEl?.textContent?.trim();

            // Extract prize pool
            let prizePool: string | undefined;
            const prizeMatch = cardText.match(/([\d,]+(?:\.\d+)?)\s*(USDC|USDT|USD|ETH)/i);
            if (prizeMatch) {
              prizePool = `${prizeMatch[1]} ${prizeMatch[2].toUpperCase()}`;
            }

            // Extract participant count
            let participantCount: number | undefined;
            const participantMatch = cardText.match(/(\d+)\s*(Builders?|participants?)/i);
            if (participantMatch) {
              participantCount = parseInt(participantMatch[1], 10);
            }

            // Extract logo
            const logoEl = cardContainer.querySelector("img");
            const logoUrl = logoEl?.src;

            // Extract organizer
            const organizerEl = cardContainer.querySelector("[class*='organizer'], [class*='sponsor']");
            const organizer = organizerEl?.textContent?.trim();

            // Extract tags
            const tags: string[] = [];
            cardContainer.querySelectorAll("[class*='tag'], [class*='badge'], li").forEach((tagEl) => {
              const tagText = tagEl.textContent?.trim();
              if (tagText && tagText.startsWith("#")) {
                tags.push(tagText.replace("#", ""));
              }
            });

            // Determine status
            let status = "upcoming";
            const lowerText = cardText.toLowerCase();
            if (lowerText.includes("building") || lowerText.includes("live") || lowerText.includes("judging")) {
              status = "ongoing";
            } else if (lowerText.includes("closed") || lowerText.includes("ended")) {
              status = "completed";
            } else if (lowerText.includes("open") || lowerText.includes("coming soon")) {
              status = "registration_open";
            }

            results.push({
              id,
              name,
              description,
              prizePool,
              participantCount,
              logoUrl,
              organizer,
              tags,
              status,
              registrationUrl: href,
              type: pageType,
            });
          });

          return results;
        }, type);

        log.info(`Extracted ${hackathonData.length} ${type}s from ${request.url}`);

        // Create hackathon objects
        const now = new Date();
        for (const data of hackathonData) {
          if (hackathons.some(h => h.id === data.id)) continue;

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

          // Extract chains from tags
          const chains = extractChainsFromTags(data.tags || []);

          hackathons.push({
            id: `${type}-${data.id}`,
            name: data.name,
            description: data.description,
            startDate,
            endDate,
            format: "online",
            prizePool: data.prizePool,
            participantCount: data.participantCount,
            chains,
            tags: data.tags,
            logoUrl: data.logoUrl,
            registrationUrl: data.registrationUrl,
            organizer: data.organizer,
            status: data.status,
            type: type as "hackathon" | "buildathon",
          });
        }

        found = hackathons.length;
      },
    });

    // Run on both Buildathons and Hackathons pages
    await crawler.run([
      `${this.baseUrl}/wave-hacks`,
      `${this.baseUrl}/hackathons`,
    ]);

    // Remove duplicates
    const uniqueHackathons = Array.from(
      new Map(hackathons.map(h => [h.id, h])).values()
    );

    console.log(`Akindo: Found ${uniqueHackathons.length} total (Buildathons + Hackathons)`);

    for (const hackathon of uniqueHackathons) {
      try {
        const result = await this.saveHackathon(hackathon);
        if (result === "created") created++;
        else if (result === "updated") updated++;
      } catch (error) {
        console.error(`Failed to save hackathon ${hackathon.name}:`, error);
      }
    }

    return { found: uniqueHackathons.length, created, updated };
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
      mina: "Mina",
      linera: "Linera",
      aleo: "Aleo",
      iotex: "IoTeX",
      zora: "Zora",
      zetachain: "ZetaChain",
      massa: "Massa",
      xrpl: "XRPL",
      near: "NEAR",
      cosmos: "Cosmos",
      polkadot: "Polkadot",
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

  private async saveHackathon(hackathon: AkindoHackathon): Promise<"created" | "updated" | "unchanged"> {
    const { chains, chainIds } = normalizeChains(hackathon.chains || ["Multi-chain"]);

    const categories = this.mapTagsToCategories(hackathon.tags || []);

    const hackathonData = {
      source: this.source,
      source_id: hackathon.id,
      slug: generateSlug(hackathon.name, this.source, hackathon.id),
      name: hackathon.name,
      description: hackathon.description || null,
      short_description: hackathon.type === "buildathon" ? "Akindo Buildathon" : null,
      start_date: hackathon.startDate,
      end_date: hackathon.endDate,
      registration_start_date: null,
      registration_end_date: null,
      timezone: null,
      format: hackathon.format as HackathonFormat,
      location: hackathon.location ? { location: hackathon.location } : null,
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
      is_official: true,
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

  private mapTagsToCategories(tags: string[]): string[] {
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
    };

    const categories: string[] = [];
    for (const tag of tags) {
      const normalized = tag.toLowerCase();
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
