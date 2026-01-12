import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import type { GrantStatus, FundingFormat } from "@buidltown/shared";

interface AlchemyGrant {
  name: string;
  slug: string;
  foundation: string;
  chain: string;
  description: string;
  funding?: {
    minAmount?: number;
    maxAmount?: number;
    currency: string;
    format: FundingFormat;
  };
  categories: string[];
  tracks: string[];
  applicationUrl: string;
  logoUrl?: string;
  isRolling: boolean;
}

/**
 * Scraper for Alchemy's curated grants list
 * https://www.alchemy.com/best/web3-grants
 */
export class AlchemyGrantsScraper {
  private source = "alchemy_grants";
  private baseUrl = "https://www.alchemy.com/best/web3-grants";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    const grants: AlchemyGrant[] = [];
    let found = 0;
    let created = 0;
    let updated = 0;

    const crawler = new PlaywrightCrawler({
      maxConcurrency: 1,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 120,
    });

    // Add helper methods to crawler context
    const detectChain = this.detectChain.bind(this);
    const detectCategories = this.detectCategories.bind(this);

    // Override requestHandler with bound methods
    crawler.router.addDefaultHandler(async ({ page, request, log }) => {
      log.info(`Processing ${request.url}`);

      await page.waitForSelector("h2, h3", { timeout: 30000 });

      // Scroll to load all content
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(300);
      }

      // Get all text content and links
      const pageContent = await page.evaluate(() => {
        const items: Array<{
          name: string;
          description: string;
          link: string;
        }> = [];

        // Find all headings that might be grant names
        const headings = document.querySelectorAll("h2, h3");
        headings.forEach((heading) => {
          const text = heading.textContent?.trim() || "";
          // Match numbered items or grant-related headings
          if (/^\d+\./.test(text) ||
              text.toLowerCase().includes("grant") ||
              text.toLowerCase().includes("fund")) {

            const parent = heading.closest("section") || heading.parentElement;
            const paragraphs = parent?.querySelectorAll("p");
            let description = "";
            paragraphs?.forEach((p) => {
              description += " " + (p.textContent?.trim() || "");
            });

            const link = parent?.querySelector("a[href*='http']") as HTMLAnchorElement;

            if (link) {
              items.push({
                name: text.replace(/^\d+\.\s*/, ""),
                description: description.trim().slice(0, 500),
                link: link.href,
              });
            }
          }
        });

        return items;
      });

      for (const item of pageContent) {
        const chain = detectChain(item.name, item.name);

        grants.push({
          name: item.name,
          slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          foundation: item.name.split(" ")[0],
          chain,
          description: item.description,
          categories: detectCategories(item.description),
          tracks: [],
          applicationUrl: item.link,
          isRolling: true,
        });
      }

      found = grants.length;
    });

    await crawler.run([this.baseUrl]);

    // Save to database
    for (const grant of grants) {
      try {
        const result = await this.saveGrant(grant);
        if (result === "created") created++;
        else if (result === "updated") updated++;
      } catch (error) {
        console.error(`Failed to save grant ${grant.name}:`, error);
      }
    }

    return { found, created, updated };
  }

  private detectChain(name: string, foundation: string): string {
    const text = (name + " " + foundation).toLowerCase();

    if (text.includes("ethereum") || text.includes("eth ")) return "Ethereum";
    if (text.includes("solana") || text.includes("sol ")) return "Solana";
    if (text.includes("polygon") || text.includes("matic")) return "Polygon";
    if (text.includes("arbitrum") || text.includes("arb ")) return "Arbitrum";
    if (text.includes("optimism") || text.includes("op ")) return "Optimism";
    if (text.includes("base")) return "Base";
    if (text.includes("near")) return "NEAR";
    if (text.includes("sui")) return "Sui";
    if (text.includes("aptos")) return "Aptos";
    if (text.includes("cosmos") || text.includes("atom")) return "Cosmos";
    if (text.includes("avalanche") || text.includes("avax")) return "Avalanche";
    if (text.includes("bnb") || text.includes("binance")) return "BNB Chain";
    if (text.includes("zksync")) return "zkSync";
    if (text.includes("scroll")) return "Scroll";
    if (text.includes("linea")) return "Linea";

    return "Multi-chain";
  }

  private detectCategories(description: string): string[] {
    const categories: string[] = [];
    const text = description.toLowerCase();

    if (text.includes("defi") || text.includes("finance")) categories.push("DeFi");
    if (text.includes("nft") || text.includes("art")) categories.push("NFT");
    if (text.includes("gaming") || text.includes("game")) categories.push("Gaming");
    if (text.includes("infrastructure") || text.includes("tooling")) categories.push("Infrastructure");
    if (text.includes("dao") || text.includes("governance")) categories.push("DAO");
    if (text.includes("social") || text.includes("community")) categories.push("Social");
    if (text.includes("security") || text.includes("audit")) categories.push("Security");
    if (text.includes("education") || text.includes("learn")) categories.push("Education");
    if (text.includes("research")) categories.push("Research");
    if (text.includes("public good")) categories.push("Public Goods");

    return categories.length > 0 ? categories : ["General"];
  }

  private async saveGrant(grant: AlchemyGrant): Promise<"created" | "updated" | "unchanged"> {
    const grantData = {
      source: this.source,
      source_id: grant.slug,
      slug: generateSlug(grant.name, this.source, grant.slug),
      name: grant.name,
      program_name: null,
      description: grant.description || null,
      short_description: grant.description?.slice(0, 200) || null,
      foundation: {
        name: grant.foundation,
        chain: grant.chain,
      },
      funding: grant.funding || null,
      application_deadline: null,
      program_start_date: null,
      program_end_date: null,
      is_rolling: grant.isRolling,
      categories: grant.categories,
      tracks: grant.tracks,
      eligibility: null,
      application_url: grant.applicationUrl,
      guidelines_url: null,
      faq_url: null,
      logo_url: grant.logoUrl || null,
      banner_url: null,
      status: "active" as GrantStatus,
      is_featured: false,
      chains: [grant.chain],
      chain_ids: [],
      raw_data: grant as unknown as Record<string, unknown>,
      content_hash: generateContentHash(grant as unknown as Record<string, unknown>),
      last_scraped_at: new Date().toISOString(),
    };

    // Check if exists
    const { data: existing } = await supabase
      .from("grants")
      .select("id, content_hash")
      .eq("source", this.source)
      .eq("source_id", grant.slug)
      .single();

    if (!existing) {
      await supabase.from("grants").insert(grantData);
      return "created";
    }

    if (existing.content_hash !== grantData.content_hash) {
      await supabase
        .from("grants")
        .update(grantData)
        .eq("id", existing.id);
      return "updated";
    }

    return "unchanged";
  }
}
