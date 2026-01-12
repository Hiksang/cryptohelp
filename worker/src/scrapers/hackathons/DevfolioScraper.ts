import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { HackathonFormat, HackathonStatus } from "../../types.js";

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
    const parseDateRange = this.parseDateRange.bind(this);

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
            dateText?: string;
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

            // Extract date text - look for date patterns like "Jan 15 - Feb 20, 2026"
            let dateText: string | undefined;
            const datePatterns = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{1,2})?,?\s*\d{4}/i;
            const dateMatch = cardText.match(datePatterns);
            if (dateMatch) {
              dateText = dateMatch[0];
            }

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
              dateText,
            });
          });

          return results;
        });

        log.info(`Extracted ${hackathonData.length} hackathons`);

        // Create hackathon objects
        for (const data of hackathonData) {
          // Skip if already exists
          if (hackathons.some(h => h.slug === data.slug)) continue;

          // Parse dates from dateText if available
          const now = new Date();
          let startDate = now.toISOString();
          let endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

          if (data.dateText) {
            const parsed = parseDateRange(data.dateText);
            if (parsed) {
              startDate = parsed.startDate;
              endDate = parsed.endDate;
            }
          } else {
            // Fallback: estimate based on status
            if (data.status === "completed") {
              startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
              endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            } else if (data.status === "ongoing") {
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
              endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            }
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

    // Fetch details from individual hackathon pages to get actual dates
    console.log(`Fetching detail pages for ${hackathons.length} hackathons...`);
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

  private async fetchHackathonDetails(hackathons: DevfolioHackathon[]): Promise<void> {
    const parseDetailPageDate = this.parseDetailPageDate.bind(this);

    const detailCrawler = new PlaywrightCrawler({
      maxConcurrency: 3,
      maxRequestRetries: 2,
      requestHandlerTimeoutSecs: 30,

      async requestHandler({ page, request, log }) {
        const slug = request.userData.slug;
        const hackathon = hackathons.find(h => h.slug === slug);
        if (!hackathon) return;

        try {
          await page.waitForLoadState("domcontentloaded");

          // Extract dates from the detail page
          const pageText = await page.textContent("body") || "";

          // Look for date patterns in the page
          // Common formats: "Jan 15 - Feb 20, 2026", "January 15, 2026 - February 20, 2026"
          const datePatterns = [
            // "Jan 15 - Feb 20, 2026" or "Jan 15 - 20, 2026"
            /(\d{1,2})\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-–to]+\s*(\d{1,2})\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s*(\d{4})/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s*[-–to]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?[a-z]*\s*(\d{1,2}),?\s*(\d{4})/i,
            // ISO-style dates
            /(\d{4})-(\d{2})-(\d{2})T/,
          ];

          let foundDate = false;
          for (const pattern of datePatterns) {
            const match = pageText.match(pattern);
            if (match) {
              log.info(`Found date pattern for ${slug}: ${match[0]}`);
              const parsed = parseDetailPageDate(match[0]);
              if (parsed) {
                hackathon.startDate = parsed.startDate;
                hackathon.endDate = parsed.endDate;
                foundDate = true;
                break;
              }
            }
          }

          if (!foundDate) {
            // Try to find structured date data in script tags or data attributes
            const scripts = await page.$$eval("script[type='application/ld+json']", els =>
              els.map(el => el.textContent)
            );
            for (const script of scripts) {
              if (script) {
                try {
                  const data = JSON.parse(script);
                  if (data.startDate) {
                    hackathon.startDate = new Date(data.startDate).toISOString();
                  }
                  if (data.endDate) {
                    hackathon.endDate = new Date(data.endDate).toISOString();
                  }
                  foundDate = true;
                } catch {}
              }
            }
          }

          if (!foundDate) {
            log.warning(`Could not find dates for ${slug}`);
          }

          // Extract images
          // Try og:image for banner
          const ogImage = await page.$('meta[property="og:image"]');
          if (ogImage) {
            const content = await ogImage.getAttribute("content");
            if (content) {
              hackathon.coverImg = content;
              log.info(`Found banner for ${slug}: ${content.substring(0, 50)}...`);
            }
          }

          // Try to find logo
          const logoImg = await page.$('img[alt*="logo"], img[class*="logo"], [class*="hackathon"] img');
          if (logoImg && !hackathon.logo) {
            const src = await logoImg.getAttribute("src");
            if (src && !src.includes("avatar") && !src.includes("profile")) {
              hackathon.logo = src;
            }
          }
        } catch (error) {
          log.warning(`Failed to fetch details for ${slug}: ${error}`);
        }
      },
    });

    // Create requests for each hackathon detail page
    const requests = hackathons.map(h => ({
      url: h.registrationUrl,
      userData: { slug: h.slug }
    }));

    await detailCrawler.run(requests);
  }

  private parseDetailPageDate(dateText: string): { startDate: string; endDate: string } | null {
    const months: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5,
      jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
      oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
    };

    try {
      // Pattern: "Jan 15 - Feb 20, 2026"
      const rangeMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})\s*[-–to]+\s*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (rangeMatch) {
        const startMonth = months[rangeMatch[1].toLowerCase()];
        const startDay = parseInt(rangeMatch[2], 10);
        const endMonth = months[rangeMatch[3].toLowerCase()];
        const endDay = parseInt(rangeMatch[4], 10);
        const year = parseInt(rangeMatch[5], 10);

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

      // ISO format - extract full date portion
      const isoMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1; // JS months are 0-indexed
        const day = parseInt(isoMatch[3], 10);
        const date = new Date(year, month, day);
        // For single date, assume 3-day event
        const endDate = new Date(year, month, day + 3);
        return {
          startDate: date.toISOString(),
          endDate: endDate.toISOString()
        };
      }
    } catch (error) {
      console.error(`Failed to parse detail page date: ${dateText}`, error);
    }

    return null;
  }

  private parseDateRange(dateText: string): { startDate: string; endDate: string } | null {
    // Parse date ranges like "Jan 15 - Feb 20, 2026" or "Jan 15, 2026"
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    try {
      // Pattern: "Jan 15 - Feb 20, 2026" or "Jan 15 - 20, 2026"
      const rangeMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(?:([A-Za-z]+)\s+)?(\d{1,2}),?\s*(\d{4})/i);
      if (rangeMatch) {
        const startMonth = months[rangeMatch[1].toLowerCase().substring(0, 3)];
        const startDay = parseInt(rangeMatch[2], 10);
        const endMonth = rangeMatch[3] ? months[rangeMatch[3].toLowerCase().substring(0, 3)] : startMonth;
        const endDay = parseInt(rangeMatch[4], 10);
        const year = parseInt(rangeMatch[5], 10);

        if (startMonth !== undefined && endMonth !== undefined) {
          const startDate = new Date(year, startMonth, startDay);
          const endDate = new Date(year, endMonth, endDay);
          return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          };
        }
      }

      // Pattern: "Jan 15, 2026" (single date)
      const singleMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (singleMatch) {
        const month = months[singleMatch[1].toLowerCase().substring(0, 3)];
        const day = parseInt(singleMatch[2], 10);
        const year = parseInt(singleMatch[3], 10);

        if (month !== undefined) {
          const date = new Date(year, month, day);
          // For single date, assume 3-day event
          const endDate = new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000);
          return {
            startDate: date.toISOString(),
            endDate: endDate.toISOString()
          };
        }
      }
    } catch (error) {
      console.error(`Failed to parse date: ${dateText}`, error);
    }

    return null;
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
