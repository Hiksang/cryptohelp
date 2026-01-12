import { PlaywrightCrawler, Dataset } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains, extractChainsFromText } from "../../utils/chainNormalizer.js";
import type { Hackathon, HackathonFormat, HackathonStatus } from "../../types.js";

interface EthGlobalEvent {
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  location: string;
  format: "online" | "in-person" | "hybrid";
  prizePool?: number;
  registrationUrl: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
}

export class EthGlobalScraper {
  private source = "ethglobal";
  private baseUrl = "https://ethglobal.com";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    const events: EthGlobalEvent[] = [];
    let found = 0;
    let created = 0;
    let updated = 0;
    const baseUrl = this.baseUrl;

    const crawler = new PlaywrightCrawler({
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 60,

      async requestHandler({ page, request, log }) {
        log.info(`Processing ${request.url}`);

        // Wait for the events to load
        await page.waitForSelector('[data-testid="event-card"], .event-card, article', {
          timeout: 30000,
        }).catch(() => {
          log.warning("Event cards not found with expected selectors, trying alternative...");
        });

        // Try multiple selectors for event cards
        const eventCards = await page.$$('article, [data-testid="event-card"], .event-card, a[href*="/events/"]');

        for (const card of eventCards) {
          try {
            const nameEl = await card.$("h2, h3, .event-name, [class*='title']");
            const name = nameEl ? await nameEl.textContent() : null;
            if (!name) continue;

            const linkEl = await card.$("a[href*='/events/']");
            const href = linkEl ? await linkEl.getAttribute("href") : null;
            const slug = href?.split("/events/")[1]?.split("/")[0] || name.toLowerCase().replace(/\s+/g, "-");

            const dateEl = await card.$("[class*='date'], time, .event-date");
            const dateText = dateEl ? await dateEl.textContent() : null;

            const locationEl = await card.$("[class*='location'], .event-location");
            const location = locationEl ? await locationEl.textContent() : "Online";

            // Determine format from location
            let format: EthGlobalEvent["format"] = "online";
            if (location?.toLowerCase().includes("online") || location?.toLowerCase().includes("virtual")) {
              format = "online";
            } else if (location && location.trim() !== "") {
              format = "in-person";
            }

            events.push({
              name: name.trim(),
              slug,
              startDate: dateText || new Date().toISOString(),
              endDate: dateText || new Date().toISOString(),
              location: location?.trim() || "Online",
              format,
              prizePool: undefined, // Would need to scrape detail page
              registrationUrl: `${baseUrl}/events/${slug}`,
            });
          } catch (error) {
            log.warning(`Failed to parse event card: ${error}`);
          }
        }

        found = events.length;
      },
    });

    await crawler.run([`${this.baseUrl}/events`]);

    // Fetch details from individual event pages to get actual dates
    console.log(`ETHGlobal: Fetching detail pages for ${events.length} events...`);
    await this.fetchEventDetails(events);

    // Ensure all dates are in ISO format before saving
    for (const event of events) {
      // If startDate is not ISO format, try to parse it
      if (!event.startDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parsed = this.parseEventDate(event.startDate);
        if (parsed) {
          event.startDate = parsed.startDate;
          event.endDate = parsed.endDate;
        }
      }
    }

    // Save to database
    for (const event of events) {
      try {
        const result = await this.saveEvent(event);
        if (result === "created") created++;
        else if (result === "updated") updated++;
      } catch (error) {
        console.error(`Failed to save event ${event.name}:`, error);
      }
    }

    return { found, created, updated };
  }

  private async saveEvent(event: EthGlobalEvent): Promise<"created" | "updated" | "unchanged"> {
    const { chains, chainIds } = normalizeChains(["Ethereum"]);

    const hackathonData = {
      source: this.source,
      source_id: event.slug,
      slug: generateSlug(event.name, this.source, event.slug),
      name: event.name,
      description: event.description || null,
      short_description: null,
      start_date: event.startDate,
      end_date: event.endDate,
      registration_start_date: null,
      registration_end_date: null,
      timezone: null,
      format: event.format as HackathonFormat,
      location: event.format !== "online" ? { location: event.location } : null,
      prize_pool: event.prizePool ? { amount: event.prizePool, currency: "USD" } : null,
      chains,
      chain_ids: chainIds,
      categories: ["infrastructure"],
      themes: [],
      sponsors: [],
      registration_url: event.registrationUrl,
      website_url: event.registrationUrl,
      discord_url: null,
      telegram_url: null,
      twitter_url: null,
      logo_url: event.logoUrl || null,
      banner_url: event.bannerUrl || null,
      participant_count: null,
      project_count: null,
      status: this.determineStatus(event.startDate, event.endDate),
      is_official: true,
      is_featured: false,
      raw_data: event as unknown as Record<string, unknown>,
      content_hash: generateContentHash(event as unknown as Record<string, unknown>),
      last_scraped_at: new Date().toISOString(),
    };

    // Check if exists
    const { data: existing } = await supabase
      .from("hackathons")
      .select("id, content_hash")
      .eq("source", this.source)
      .eq("source_id", event.slug)
      .single();

    if (!existing) {
      const { error } = await supabase.from("hackathons").insert(hackathonData);
      if (error) {
        console.error(`Failed to insert ${event.slug}:`, error.message);
        return "unchanged";
      }
      return "created";
    }

    if (existing.content_hash !== hackathonData.content_hash) {
      const { error } = await supabase
        .from("hackathons")
        .update(hackathonData)
        .eq("id", existing.id);
      if (error) {
        console.error(`Failed to update ${event.slug}:`, error.message);
        return "unchanged";
      }
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

  private async fetchEventDetails(events: EthGlobalEvent[]): Promise<void> {
    const parseEventDate = this.parseEventDate.bind(this);
    const baseUrl = this.baseUrl;

    const detailCrawler = new PlaywrightCrawler({
      maxConcurrency: 3,
      maxRequestRetries: 2,
      requestHandlerTimeoutSecs: 30,

      async requestHandler({ page, request, log }) {
        const slug = request.userData.slug;
        const event = events.find(e => e.slug === slug);
        if (!event) return;

        try {
          await page.waitForLoadState("domcontentloaded");

          // Extract dates from the detail page
          const pageText = await page.textContent("body") || "";

          // Look for date patterns - ETHGlobal uses formats like:
          // "October 18-20, 2024", "Nov 15 - 17, 2024", "March 13-15, 2026"
          // Also handles text before dates like "JudgesPartnersPrizesFAQJune 13 – 26, 2024"
          const datePatterns = [
            // "October 18-20, 2024" or "October 18 - 20, 2024" or "June 13 – 26, 2024"
            /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})/i,
            // "Oct 18 - Nov 20, 2024"
            /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[-–]\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})/i,
            // ISO format
            /(\d{4})-(\d{2})-(\d{2})/,
          ];

          let foundDate = false;
          for (const pattern of datePatterns) {
            const match = pageText.match(pattern);
            if (match) {
              log.info(`Found date pattern for ${slug}: ${match[0]}`);
              const parsed = parseEventDate(match[0]);
              if (parsed) {
                event.startDate = parsed.startDate;
                event.endDate = parsed.endDate;
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
                    event.startDate = new Date(data.startDate).toISOString();
                    foundDate = true;
                  }
                  if (data.endDate) {
                    event.endDate = new Date(data.endDate).toISOString();
                  }
                } catch {}
              }
            }
          }

          // Try meta tags
          if (!foundDate) {
            const startMeta = await page.$('meta[property="event:start_time"], meta[name="start_date"]');
            const endMeta = await page.$('meta[property="event:end_time"], meta[name="end_date"]');
            if (startMeta) {
              const content = await startMeta.getAttribute("content");
              if (content) {
                event.startDate = new Date(content).toISOString();
                foundDate = true;
              }
            }
            if (endMeta) {
              const content = await endMeta.getAttribute("content");
              if (content) {
                event.endDate = new Date(content).toISOString();
              }
            }
          }

          if (!foundDate) {
            log.warning(`Could not find dates for ${slug}`);
          }

          // Extract images
          // Try to find event logo or banner
          const ogImage = await page.$('meta[property="og:image"]');
          if (ogImage) {
            const content = await ogImage.getAttribute("content");
            if (content) {
              event.bannerUrl = content;
              log.info(`Found banner for ${slug}: ${content.substring(0, 50)}...`);
            }
          }

          // Look for logo in img tags
          const logoImg = await page.$('img[alt*="logo"], img[class*="logo"], header img, nav img');
          if (logoImg && !event.logoUrl) {
            const src = await logoImg.getAttribute("src");
            if (src && !src.includes("avatar") && !src.includes("profile")) {
              event.logoUrl = src.startsWith("http") ? src : `${baseUrl}${src}`;
            }
          }
        } catch (error) {
          log.warning(`Failed to fetch details for ${slug}: ${error}`);
        }
      },
    });

    // Create requests for each event detail page
    const requests = events.map(e => ({
      url: e.registrationUrl,
      userData: { slug: e.slug }
    }));

    await detailCrawler.run(requests);
  }

  private parseEventDate(dateText: string): { startDate: string; endDate: string } | null {
    const months: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5,
      jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
      oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
    };

    try {
      // Pattern: "October 18-20, 2024" or "Oct 18 - 20, 2024" (same month)
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

      // Pattern: "Oct 18 - Nov 20, 2024" (different months)
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

      // ISO format
      const isoMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        const date = new Date(year, month, day);
        return {
          startDate: date.toISOString(),
          endDate: new Date(year, month, day + 3).toISOString()
        };
      }

      // Pattern: "Nov 21st, 2025" or "July 8th, 2022" (single date with ordinal)
      const ordinalMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
      if (ordinalMatch) {
        const month = months[ordinalMatch[1].toLowerCase()];
        const day = parseInt(ordinalMatch[2], 10);
        const year = parseInt(ordinalMatch[3], 10);

        if (month !== undefined) {
          const date = new Date(year, month, day);
          return {
            startDate: date.toISOString(),
            endDate: new Date(year, month, day + 2).toISOString() // Assume 3-day event
          };
        }
      }
    } catch (error) {
      console.error(`Failed to parse event date: ${dateText}`, error);
    }

    return null;
  }
}
