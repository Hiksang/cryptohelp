import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase";
import { generateContentHash, generateSlug } from "../../utils/hash";
import { normalizeChains } from "../../utils/chainNormalizer";
import { parseEventDates } from "../../utils/dateParser";
import type { HackathonFormat, HackathonStatus } from "../../../lib/shared";

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
      maxConcurrency: 1,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 120,
      headless: true,

      async requestHandler({ page, request, log }) {
        log.info(`Processing ${request.url}`);

        // Wait for page to fully load
        await page.waitForLoadState("networkidle");

        // Wait for content to appear
        await page.waitForTimeout(3000);

        // Try to find event sections
        // ETHGlobal typically has sections for Upcoming, Ongoing, and Past events
        const sections = await page.$$("section, [class*='section'], [class*='events']");
        log.info(`Found ${sections.length} sections`);

        // Get all links that look like event links
        const eventLinks = await page.$$eval(
          "a[href*='/events/']",
          (links) => links.map((link) => {
            const href = link.getAttribute("href") || "";
            const text = link.textContent || "";
            const parent = link.closest("article, div, li");
            const parentText = parent?.textContent || "";
            return { href, text, parentText };
          })
        );

        log.info(`Found ${eventLinks.length} event links`);

        // Process each unique event
        const seenSlugs = new Set<string>();

        for (const linkInfo of eventLinks) {
          try {
            const href = linkInfo.href;
            const slug = href.split("/events/")[1]?.split("/")[0]?.split("?")[0];

            if (!slug || seenSlugs.has(slug)) continue;
            seenSlugs.add(slug);

            // Extract event name - usually in the link or nearby heading
            let name = linkInfo.text.trim();

            // Clean up the name
            if (!name || name.length < 3) {
              // Try to extract from parent text
              const lines = linkInfo.parentText.split("\n").filter((l) => l.trim());
              name = lines[0]?.trim() || slug;
            }

            // Skip non-event links (but name might have date appended, so check original)
            const nameLower = name.toLowerCase();
            if (nameLower.includes("apply now") ||
                nameLower.includes("register now") ||
                nameLower.includes("view all") ||
                nameLower.includes("learn more")) {
              continue;
            }

            // The name often has date concatenated: "ETHGlobal BangkokNov 15th, 2024Nov 17th, 2024Hackathon"
            // Try to parse dates from the name itself
            let parsedDates = parseEventDates(name);

            // Clean up the event name by removing date parts and event type
            let cleanName = name
              .replace(/([A-Z][a-z]{2,})\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/g, "") // Remove "Nov 15th, 2024"
              .replace(/(Hackathon|Conference|Summit|Virtual|Online|Co-working|Competition)/gi, "")
              .replace(/ETHGlobal's First/gi, "")
              .trim();

            // If clean name is too short, use the slug
            if (cleanName.length < 3) {
              cleanName = slug
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            }

            name = cleanName;

            // Determine format from parent text
            const parentLower = linkInfo.parentText.toLowerCase();
            let format: EthGlobalEvent["format"] = "in-person";
            let location = "";

            if (parentLower.includes("online") || parentLower.includes("virtual")) {
              format = "online";
              location = "Online";
            } else if (parentLower.includes("hybrid")) {
              format = "hybrid";
            }

            // Try to extract location (city names) - also check the clean name
            const textToSearch = (name + " " + linkInfo.parentText).toLowerCase();
            const cityPatterns = [
              /\b(bangkok|singapore|tokyo|london|paris|new york|san francisco|berlin|denver|dubai|mumbai|new delhi|delhi|seoul|taipei|brussels|cannes|sydney|melbourne|amsterdam|lisbon|prague|warsaw|istanbul|waterloo|buenos aires)\b/i,
            ];

            for (const pattern of cityPatterns) {
              const cityMatch = textToSearch.match(pattern);
              if (cityMatch) {
                location = cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1);
                break;
              }
            }

            // Only add if we have valid dates or it's a valid looking event
            if (parsedDates || name.toLowerCase().includes("ethglobal") || name.toLowerCase().includes("pragma")) {
              events.push({
                name,
                slug,
                startDate: parsedDates?.startDate || "",
                endDate: parsedDates?.endDate || "",
                location: location || "TBA",
                format,
                registrationUrl: `${baseUrl}/events/${slug}`,
              });
              log.info(`Found event: ${name} (${slug}) - ${parsedDates ? "has dates" : "no date"}`);
            }
          } catch (error) {
            log.warning(`Failed to parse event link: ${error}`);
          }
        }

        found = events.length;
        log.info(`Total events found: ${found}`);
      },
    });

    await crawler.run([`${this.baseUrl}/events`]);

    // Save to database
    for (const event of events) {
      // Skip events without valid dates
      if (!event.startDate || !event.endDate) {
        console.log(`Skipping ${event.name} - no valid dates`);
        continue;
      }

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
      location: event.format !== "online" ? { city: event.location } : null,
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
