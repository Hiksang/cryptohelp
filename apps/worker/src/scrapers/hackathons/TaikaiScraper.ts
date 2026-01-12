import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { HackathonFormat, HackathonStatus } from "@cryptohelp/shared";

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
              startDate: dateText || new Date().toISOString(),
              endDate: dateText || new Date().toISOString(),
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
      discord_url: null,
      telegram_url: null,
      twitter_url: null,
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
}
