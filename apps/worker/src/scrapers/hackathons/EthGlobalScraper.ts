import { PlaywrightCrawler, Dataset } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains, extractChainsFromText } from "../../utils/chainNormalizer.js";
import type { Hackathon, HackathonFormat, HackathonStatus } from "@buidltown/shared";

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
}
