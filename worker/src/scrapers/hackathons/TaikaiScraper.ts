import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { HackathonFormat, HackathonStatus } from "../../types.js";

interface TaikaiHackathon {
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
  logoUrl?: string;
  bannerUrl?: string;
  registrationUrl: string;
  discordUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}

export class TaikaiScraper {
  private source = "taikai";
  private baseUrl = "https://taikai.network";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    const hackathons: TaikaiHackathon[] = [];
    let found = 0;
    let created = 0;
    let updated = 0;
    const baseUrl = this.baseUrl;

    const crawler = new PlaywrightCrawler({
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 120,

      async requestHandler({ page, request, log }) {
        log.info(`Processing ${request.url}`);

        await page.waitForLoadState("networkidle");

        // Scroll to load more
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1000);
        }

        // Find hackathon cards
        const hackathonCards = await page.$$('[class*="hackathon-card"], [class*="challenge-card"], [class*="event-card"], a[href*="/hackathons/"]');

        log.info(`Found ${hackathonCards.length} hackathon cards`);

        for (const card of hackathonCards) {
          try {
            const linkEl = await card.$('a[href*="/hackathons/"]');
            const href = linkEl ? await linkEl.getAttribute("href") : await card.getAttribute("href");
            if (!href || !href.includes("/hackathons/")) continue;

            const id = href.split("/hackathons/")[1]?.split("/")[0]?.split("?")[0];
            if (!id) continue;

            const nameEl = await card.$("h2, h3, h4, [class*='title'], [class*='name']");
            const name = nameEl ? await nameEl.textContent() : null;
            if (!name) continue;

            const dateEl = await card.$("[class*='date'], [class*='period'], time");
            const dateText = dateEl ? await dateEl.textContent() : null;

            const prizeEl = await card.$("[class*='prize'], [class*='reward']");
            const prizeText = prizeEl ? await prizeEl.textContent() : null;

            const participantEl = await card.$("[class*='participant'], [class*='team']");
            const participantText = participantEl ? await participantEl.textContent() : null;
            const participantMatch = participantText?.match(/(\d+)/);

            const logoEl = await card.$("img[src*='logo'], img:first-of-type");
            const logoUrl = logoEl ? await logoEl.getAttribute("src") : null;

            let format: TaikaiHackathon["format"] = "online";
            const cardText = await card.textContent() || "";
            if (cardText.toLowerCase().includes("in-person") || cardText.toLowerCase().includes("offline")) {
              format = "in-person";
            } else if (cardText.toLowerCase().includes("hybrid")) {
              format = "hybrid";
            }

            hackathons.push({
              id,
              name: name.trim(),
              startDate: "", // Will be fetched from detail page
              endDate: "", // Will be fetched from detail page
              format,
              prizePool: prizeText?.trim(),
              participantCount: participantMatch ? parseInt(participantMatch[1]) : undefined,
              logoUrl: logoUrl || undefined,
              registrationUrl: `${baseUrl}/hackathons/${id}`,
            });
          } catch (error) {
            log.warning(`Failed to parse hackathon card: ${error}`);
          }
        }

        found = hackathons.length;
      },
    });

    await crawler.run([`${this.baseUrl}/hackathons`]);

    // Remove duplicates
    const uniqueHackathons = Array.from(
      new Map(hackathons.map(h => [h.id, h])).values()
    );

    // Fetch details from individual hackathon pages
    console.log(`Taikai: Fetching detail pages for ${uniqueHackathons.length} hackathons...`);
    await this.fetchHackathonDetails(uniqueHackathons);

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

  private async saveHackathon(hackathon: TaikaiHackathon): Promise<"created" | "updated" | "unchanged"> {
    const { chains, chainIds } = normalizeChains(hackathon.chains || ["Multi-chain"]);

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
      location: hackathon.location ? { location: hackathon.location } : null,
      prize_pool: hackathon.prizePool ? { amount: hackathon.prizePool, currency: "USD" } : null,
      chains,
      chain_ids: chainIds,
      categories: ["web3"],
      themes: [],
      sponsors: [],
      registration_url: hackathon.registrationUrl,
      website_url: hackathon.registrationUrl,
      discord_url: hackathon.discordUrl || null,
      telegram_url: hackathon.telegramUrl || null,
      twitter_url: hackathon.twitterUrl || null,
      logo_url: hackathon.logoUrl || null,
      banner_url: hackathon.bannerUrl || null,
      participant_count: hackathon.participantCount || null,
      project_count: null,
      status: this.determineStatus(hackathon.startDate, hackathon.endDate),
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

  private determineStatus(startDate: string, endDate: string): HackathonStatus {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "ongoing";
    return "completed";
  }

  private async fetchHackathonDetails(hackathons: TaikaiHackathon[]): Promise<void> {
    const parseDate = this.parseDate.bind(this);

    const detailCrawler = new PlaywrightCrawler({
      maxConcurrency: 3,
      maxRequestRetries: 2,
      requestHandlerTimeoutSecs: 60,

      async requestHandler({ page, request, log }) {
        const id = request.userData.id;
        const hackathon = hackathons.find(h => h.id === id);
        if (!hackathon) return;

        try {
          await page.waitForLoadState("domcontentloaded");
          await page.waitForTimeout(2000);

          const pageText = await page.textContent("body") || "";

          // Extract dates - Taikai uses formats like "Jan 15 - Feb 20, 2025" or "15 Jan - 20 Feb 2025"
          const datePatterns = [
            // "Jan 15 - Feb 20, 2025" or "Jan 15 – Feb 20, 2025"
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})/i,
            // "Jan 15 - 20, 2025" (same month)
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})/i,
            // "15 Jan - 20 Feb 2025"
            /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*[-–]\s*(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*,?\s*(\d{4})/i,
            // "January 15 - February 20, 2025"
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[-–]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i,
          ];

          let foundDate = false;
          for (const pattern of datePatterns) {
            const match = pageText.match(pattern);
            if (match) {
              log.info(`Found date pattern for ${id}: ${match[0]}`);
              const parsed = parseDate(match[0]);
              if (parsed) {
                hackathon.startDate = parsed.startDate;
                hackathon.endDate = parsed.endDate;
                foundDate = true;
                break;
              }
            }
          }

          // Try JSON-LD structured data
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

          // If no date found, set default based on status
          if (!foundDate || !hackathon.startDate) {
            log.warning(`Could not find dates for ${id}, using default`);
            const now = new Date();
            hackathon.startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            hackathon.endDate = new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000).toISOString();
          }

          // Extract description
          const descEl = await page.$('[class*="description"], [class*="about"], .challenge-description, article');
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
              log.info(`Found banner for ${id}`);
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

          // Extract location if available
          const locationEl = await page.$('[class*="location"], [class*="venue"]');
          if (locationEl) {
            const location = await locationEl.textContent();
            if (location && location.trim()) {
              hackathon.location = location.trim();
              if (!location.toLowerCase().includes("online") && !location.toLowerCase().includes("virtual")) {
                hackathon.format = "in-person";
              }
            }
          }

        } catch (error) {
          log.warning(`Failed to fetch details for ${id}: ${error}`);
          // Set fallback dates
          const now = new Date();
          hackathon.startDate = now.toISOString();
          hackathon.endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
      },
    });

    const requests = hackathons.map(h => ({
      url: h.registrationUrl,
      userData: { id: h.id }
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
      // Pattern: "Jan 15 - Feb 20, 2025" (different months)
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

      // Pattern: "Jan 15 - 20, 2025" (same month)
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

      // Pattern: "15 Jan - 20 Feb 2025" (day before month)
      const dayFirstMatch = dateText.match(/(\d{1,2})\s*([A-Za-z]+)\s*[-–]\s*(\d{1,2})\s*([A-Za-z]+)\s*,?\s*(\d{4})/i);
      if (dayFirstMatch) {
        const startDay = parseInt(dayFirstMatch[1], 10);
        const startMonth = months[dayFirstMatch[2].toLowerCase()];
        const endDay = parseInt(dayFirstMatch[3], 10);
        const endMonth = months[dayFirstMatch[4].toLowerCase()];
        const year = parseInt(dayFirstMatch[5], 10);

        if (startMonth !== undefined && endMonth !== undefined) {
          return {
            startDate: new Date(year, startMonth, startDay).toISOString(),
            endDate: new Date(year, endMonth, endDay).toISOString()
          };
        }
      }
    } catch (error) {
      console.error(`Failed to parse date: ${dateText}`, error);
    }

    return null;
  }
}
