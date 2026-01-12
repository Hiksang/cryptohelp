import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase";
import { generateContentHash, generateSlug } from "../../utils/hash";
import { normalizeChains } from "../../utils/chainNormalizer";
import type { HackathonFormat, HackathonStatus } from "../../../lib/shared";

interface DoraHacksHackathon {
  slug: string;
  name: string;
  organizer: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  format: "online" | "in-person" | "hybrid";
  prizePool?: string;
  status: string;
  chains?: string[];
  categories?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  registrationUrl: string;
}

export class DoraHacksScraper {
  private source = "dorahacks";
  private baseUrl = "https://dorahacks.io";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    const hackathons: DoraHacksHackathon[] = [];
    let found = 0;
    let created = 0;
    let updated = 0;
    const baseUrl = this.baseUrl;

    const crawler = new PlaywrightCrawler({
      maxConcurrency: 1,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 180,

      async requestHandler({ page, request, log }) {
        log.info(`Processing ${request.url}`);

        // Wait for hackathon list to load
        await page.waitForSelector('a[href*="/hackathon/"]', { timeout: 30000 });

        // Scroll to load more content
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1500);
        }

        // Click "View More" button if exists to load more hackathons
        const viewMoreButton = await page.$('text=View More');
        if (viewMoreButton) {
          for (let i = 0; i < 3; i++) {
            try {
              await viewMoreButton.click();
              await page.waitForTimeout(2000);
            } catch {
              break;
            }
          }
        }

        // Extract hackathon data using page.evaluate
        const hackathonData = await page.evaluate(() => {
          const results: Array<{
            slug: string;
            name: string;
            organizer: string;
            status: string;
            location: string;
            prizePool: string;
            chains: string[];
            categories: string[];
            logoUrl: string;
          }> = [];

          // Find all hackathon links
          const hackathonLinks = document.querySelectorAll('a[href*="/hackathon/"]');

          hackathonLinks.forEach((link) => {
            const href = link.getAttribute("href");
            if (!href || !href.startsWith("/hackathon/")) return;

            // Extract slug from URL
            const slug = href.replace("/hackathon/", "").split("/")[0].split("?")[0];
            if (!slug) return;

            // Get the link container
            const container = link as HTMLElement;
            const text = container.textContent || "";

            // Extract hackathon name - look for the main title
            // The name is usually the longest text that's not a tag or status
            let name = "";
            const allText = container.querySelectorAll("div, span, p");
            allText.forEach((el) => {
              const elText = el.textContent?.trim() || "";
              // Skip short texts, status indicators, and common labels
              if (
                elText.length > 10 &&
                elText.length < 150 &&
                !elText.includes("🏆") &&
                !elText.includes("Prize Pool") &&
                !elText.includes("BUIDLs") &&
                !elText.includes("Virtual") &&
                !elText.includes("Upcoming") &&
                !elText.includes("Ongoing") &&
                !elText.includes("Ended") &&
                !elText.includes("days left") &&
                !elText.includes("Password needed") &&
                !name
              ) {
                // Check if this looks like a hackathon name
                const parent = el.parentElement;
                const isLikelyName =
                  !el.querySelector("div") && // No nested divs
                  elText.split(" ").length <= 15; // Not too many words
                if (isLikelyName) {
                  name = elText;
                }
              }
            });

            // If no name found, try to extract from the text content
            if (!name) {
              // Look for text after organizer name
              const lines = text.split("\n").filter(l => l.trim());
              for (const line of lines) {
                const trimmed = line.trim();
                if (
                  trimmed.length > 5 &&
                  trimmed.length < 100 &&
                  !trimmed.includes("🏆") &&
                  !trimmed.includes("BUIDLs") &&
                  !trimmed.includes("days left")
                ) {
                  name = trimmed;
                  break;
                }
              }
            }

            if (!name) return; // Skip if no name found

            // Extract organizer - usually the first short text element
            let organizer = "";
            const firstTexts = container.querySelectorAll("div > div:first-child");
            firstTexts.forEach((el) => {
              const elText = el.textContent?.trim() || "";
              if (elText.length > 2 && elText.length < 50 && !organizer) {
                organizer = elText;
              }
            });

            // Extract status
            let status = "upcoming";
            if (text.includes("Ongoing")) status = "ongoing";
            else if (text.includes("Ended") || text.includes("Winner Announced")) status = "completed";
            else if (text.includes("Pre-registration")) status = "upcoming";
            else if (text.includes("Extended")) status = "ongoing";

            // Extract location
            let location = "Virtual";
            if (text.includes("Virtual")) {
              location = "Virtual";
            } else {
              // Try to find location text (city, country pattern)
              const locationMatch = text.match(/([A-Z][a-z]+(?:,\s*[A-Z][a-z\s]+)+)/);
              if (locationMatch) {
                location = locationMatch[1];
              }
            }

            // Extract prize pool
            let prizePool = "";
            const prizeMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*USD/);
            if (prizeMatch) {
              prizePool = prizeMatch[1] + " USD";
            }

            // Extract chains
            const chains: string[] = [];
            const chainKeywords = [
              "Ethereum", "Bitcoin", "Solana", "Polygon", "Arbitrum", "Optimism",
              "Base", "Sui", "Aptos", "Cosmos", "Starknet", "zkSync", "Scroll",
              "Linea", "Avalanche", "BNB", "Near", "Stacks", "Kaspa", "Cronos",
              "Monad", "ICP", "Stellar", "Cedra", "Farcaster"
            ];
            chainKeywords.forEach((chain) => {
              if (text.toLowerCase().includes(chain.toLowerCase())) {
                chains.push(chain);
              }
            });

            // Extract categories/tags
            const categories: string[] = [];
            const categoryKeywords = [
              "DeFi", "NFT", "Gaming", "AI", "Web3", "Blockchain", "ZK",
              "Privacy", "Infrastructure", "DAO", "Social", "Trading",
              "Public Goods", "Smart Contracts", "Move", "Solidity"
            ];
            categoryKeywords.forEach((cat) => {
              if (text.toLowerCase().includes(cat.toLowerCase())) {
                categories.push(cat);
              }
            });

            // Get logo URL
            const logoImg = container.querySelector("img");
            const logoUrl = logoImg?.getAttribute("src") || "";

            results.push({
              slug,
              name,
              organizer: organizer || "DoraHacks",
              status,
              location,
              prizePool,
              chains: chains.length > 0 ? chains : ["Multi-chain"],
              categories: categories.length > 0 ? categories : ["Web3"],
              logoUrl,
            });
          });

          return results;
        });

        log.info(`Extracted ${hackathonData.length} hackathons`);

        // Process extracted data
        for (const data of hackathonData) {
          // Skip duplicates
          if (hackathons.some(h => h.slug === data.slug)) continue;

          hackathons.push({
            slug: data.slug,
            name: data.name,
            organizer: data.organizer,
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            location: data.location,
            format: data.location === "Virtual" ? "online" : "in-person",
            prizePool: data.prizePool,
            status: data.status,
            chains: data.chains,
            categories: data.categories,
            logoUrl: data.logoUrl,
            registrationUrl: `${baseUrl}/hackathon/${data.slug}`,
          });
        }

        found = hackathons.length;
      },
    });

    await crawler.run([`${this.baseUrl}/hackathon`]);

    console.log(`DoraHacks: Found ${hackathons.length} unique hackathons`);

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

  private async saveHackathon(hackathon: DoraHacksHackathon): Promise<"created" | "updated" | "unchanged"> {
    const { chains, chainIds } = normalizeChains(hackathon.chains || ["Multi-chain"]);

    const hackathonData = {
      source: this.source,
      source_id: hackathon.slug,
      slug: generateSlug(hackathon.name, this.source, hackathon.slug),
      name: hackathon.name,
      description: hackathon.description || null,
      short_description: `Organized by ${hackathon.organizer}`,
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
      categories: hackathon.categories || ["web3"],
      themes: [],
      sponsors: [hackathon.organizer],
      registration_url: hackathon.registrationUrl,
      website_url: hackathon.registrationUrl,
      discord_url: null,
      telegram_url: null,
      twitter_url: null,
      logo_url: hackathon.logoUrl || null,
      banner_url: hackathon.bannerUrl || null,
      participant_count: null,
      project_count: null,
      status: this.mapStatus(hackathon.status),
      is_official: true,
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
      .eq("source_id", hackathon.slug)
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
      case "upcoming":
      default:
        return "upcoming";
    }
  }
}
