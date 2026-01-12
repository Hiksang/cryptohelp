import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { HackathonFormat, HackathonStatus } from "../../types.js";

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
  discordUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  participantCount?: number;
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
            startDate: "", // Will be fetched from detail page
            endDate: "", // Will be fetched from detail page
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

    // Fetch details from individual hackathon pages
    console.log(`DoraHacks: Fetching detail pages for ${hackathons.length} hackathons...`);
    await this.fetchHackathonDetails(hackathons);

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
      discord_url: hackathon.discordUrl || null,
      telegram_url: hackathon.telegramUrl || null,
      twitter_url: hackathon.twitterUrl || null,
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

  private async fetchHackathonDetails(hackathons: DoraHacksHackathon[]): Promise<void> {
    const parseDate = this.parseDate.bind(this);
    const baseUrl = this.baseUrl;

    const detailCrawler = new PlaywrightCrawler({
      maxConcurrency: 3,
      maxRequestRetries: 2,
      requestHandlerTimeoutSecs: 60,

      async requestHandler({ page, request, log }) {
        const slug = request.userData.slug;
        const hackathon = hackathons.find(h => h.slug === slug);
        if (!hackathon) return;

        try {
          await page.waitForLoadState("domcontentloaded");
          await page.waitForTimeout(2000); // Let page fully render

          const pageText = await page.textContent("body") || "";

          // Extract dates from the page
          // DoraHacks typically shows dates like "Dec 16, 2024 - Jan 15, 2025" or "Jan 6 - Feb 28, 2025"
          const datePatterns = [
            // "Dec 16, 2024 - Jan 15, 2025" (different months/years)
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})\s*[-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})/i,
            // "Jan 6 - Feb 28, 2025" (different months, same year)
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})/i,
            // "Jan 6 - 28, 2025" (same month)
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})/i,
            // "December 16 - January 15, 2025"
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[-–]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i,
          ];

          let foundDate = false;
          for (const pattern of datePatterns) {
            const match = pageText.match(pattern);
            if (match) {
              log.info(`Found date pattern for ${slug}: ${match[0]}`);
              const parsed = parseDate(match[0]);
              if (parsed) {
                hackathon.startDate = parsed.startDate;
                hackathon.endDate = parsed.endDate;
                foundDate = true;
                break;
              }
            }
          }

          // If no date found, try to extract from structured data
          if (!foundDate) {
            const scripts = await page.$$eval("script[type='application/ld+json']", els =>
              els.map(el => el.textContent)
            );
            for (const script of scripts) {
              if (script) {
                try {
                  const data = JSON.parse(script);
                  if (data.startDate) {
                    hackathon.startDate = new Date(data.startDate).toISOString();
                    foundDate = true;
                  }
                  if (data.endDate) {
                    hackathon.endDate = new Date(data.endDate).toISOString();
                  }
                } catch {}
              }
            }
          }

          // If still no date, set based on status
          if (!foundDate || !hackathon.startDate) {
            log.warning(`Could not find dates for ${slug}, using status-based estimation`);
            const now = new Date();
            if (hackathon.status === "completed") {
              hackathon.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
              hackathon.endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            } else if (hackathon.status === "ongoing") {
              hackathon.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
              hackathon.endDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString();
            } else {
              hackathon.startDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
              hackathon.endDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString();
            }
          }

          // Extract description
          const descEl = await page.$('[class*="description"], [class*="about"], .markdown-body');
          if (descEl) {
            const desc = await descEl.textContent();
            if (desc && desc.length > 50) {
              hackathon.description = desc.trim().substring(0, 1000);
            }
          }

          // Extract banner image
          const ogImage = await page.$('meta[property="og:image"]');
          if (ogImage) {
            const content = await ogImage.getAttribute("content");
            if (content) {
              hackathon.bannerUrl = content;
              log.info(`Found banner for ${slug}`);
            }
          }

          // Extract social links
          const discordLink = await page.$('a[href*="discord.gg"], a[href*="discord.com"]');
          if (discordLink) {
            hackathon.discordUrl = await discordLink.getAttribute("href") || undefined;
          }

          const twitterLink = await page.$('a[href*="twitter.com"], a[href*="x.com"]');
          if (twitterLink) {
            hackathon.twitterUrl = await twitterLink.getAttribute("href") || undefined;
          }

          const telegramLink = await page.$('a[href*="t.me"], a[href*="telegram"]');
          if (telegramLink) {
            hackathon.telegramUrl = await telegramLink.getAttribute("href") || undefined;
          }

          // Extract participant count
          const participantMatch = pageText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:BUIDLers?|participants?|builders?|hackers?)/i);
          if (participantMatch) {
            hackathon.participantCount = parseInt(participantMatch[1].replace(/,/g, ""), 10);
          }

        } catch (error) {
          log.warning(`Failed to fetch details for ${slug}: ${error}`);
          // Set fallback dates
          const now = new Date();
          hackathon.startDate = now.toISOString();
          hackathon.endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
      },
    });

    const requests = hackathons.map(h => ({
      url: h.registrationUrl,
      userData: { slug: h.slug }
    }));

    await detailCrawler.run(requests);
  }

  private parseDate(dateText: string): { startDate: string; endDate: string } | null {
    const months: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5,
      jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
      oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
    };

    try {
      // Pattern: "Dec 16, 2024 - Jan 15, 2025" (different months/years)
      const diffYearMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (diffYearMatch) {
        const startMonth = months[diffYearMatch[1].toLowerCase()];
        const startDay = parseInt(diffYearMatch[2], 10);
        const startYear = parseInt(diffYearMatch[3], 10);
        const endMonth = months[diffYearMatch[4].toLowerCase()];
        const endDay = parseInt(diffYearMatch[5], 10);
        const endYear = parseInt(diffYearMatch[6], 10);

        if (startMonth !== undefined && endMonth !== undefined) {
          return {
            startDate: new Date(startYear, startMonth, startDay).toISOString(),
            endDate: new Date(endYear, endMonth, endDay).toISOString()
          };
        }
      }

      // Pattern: "Jan 6 - Feb 28, 2025" (different months, same year)
      const diffMonthMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (diffMonthMatch) {
        const startMonth = months[diffMonthMatch[1].toLowerCase()];
        const startDay = parseInt(diffMonthMatch[2], 10);
        const endMonth = months[diffMonthMatch[3].toLowerCase()];
        const endDay = parseInt(diffMonthMatch[4], 10);
        const year = parseInt(diffMonthMatch[5], 10);

        if (startMonth !== undefined && endMonth !== undefined) {
          return {
            startDate: new Date(year, startMonth, startDay).toISOString(),
            endDate: new Date(year, endMonth, endDay).toISOString()
          };
        }
      }

      // Pattern: "Jan 6 - 28, 2025" (same month)
      const sameMonthMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})/i);
      if (sameMonthMatch) {
        const month = months[sameMonthMatch[1].toLowerCase()];
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
}
