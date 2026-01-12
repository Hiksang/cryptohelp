import "dotenv/config";
import cron from "node-cron";
import { EthGlobalScraper } from "./scrapers/hackathons/EthGlobalScraper.js";
import { DevfolioScraper } from "./scrapers/hackathons/DevfolioScraper.js";
import { DoraHacksScraper } from "./scrapers/hackathons/DoraHacksScraper.js";
import { AkindoScraper } from "./scrapers/hackathons/AkindoScraper.js";
import { DevpostScraper } from "./scrapers/hackathons/DevpostScraper.js";
import { HackQuestScraper } from "./scrapers/hackathons/HackQuestScraper.js";
import { TaikaiScraper } from "./scrapers/hackathons/TaikaiScraper.js";
import { FoundationGrantsScraper } from "./scrapers/grants/FoundationGrantsScraper.js";

const SCHEDULE = process.env.SCRAPE_SCHEDULE || "0 */6 * * *"; // Default: every 6 hours

async function runAllScrapers() {
  console.log(`[${new Date().toISOString()}] Starting all scrapers...`);

  const results: { name: string; found: number; created: number; updated: number }[] = [];

  try {
    // ETHGlobal
    console.log("\n=== ETHGlobal Scraper ===");
    const ethGlobal = new EthGlobalScraper();
    const ethResult = await ethGlobal.run();
    results.push({ name: "ETHGlobal", ...ethResult });
    console.log(`ETHGlobal: Found ${ethResult.found}, Created ${ethResult.created}, Updated ${ethResult.updated}`);

    // Devfolio
    console.log("\n=== Devfolio Scraper ===");
    const devfolio = new DevfolioScraper();
    const devResult = await devfolio.run();
    results.push({ name: "Devfolio", ...devResult });
    console.log(`Devfolio: Found ${devResult.found}, Created ${devResult.created}, Updated ${devResult.updated}`);

    // DoraHacks
    console.log("\n=== DoraHacks Scraper ===");
    const doraHacks = new DoraHacksScraper();
    const doraResult = await doraHacks.run();
    results.push({ name: "DoraHacks", ...doraResult });
    console.log(`DoraHacks: Found ${doraResult.found}, Created ${doraResult.created}, Updated ${doraResult.updated}`);

    // Akindo
    console.log("\n=== Akindo Scraper ===");
    const akindo = new AkindoScraper();
    const akindoResult = await akindo.run();
    results.push({ name: "Akindo", ...akindoResult });
    console.log(`Akindo: Found ${akindoResult.found}, Created ${akindoResult.created}, Updated ${akindoResult.updated}`);

    // Devpost
    console.log("\n=== Devpost Scraper ===");
    const devpost = new DevpostScraper();
    const devpostResult = await devpost.run();
    results.push({ name: "Devpost", ...devpostResult });
    console.log(`Devpost: Found ${devpostResult.found}, Created ${devpostResult.created}, Updated ${devpostResult.updated}`);

    // HackQuest
    console.log("\n=== HackQuest Scraper ===");
    const hackquest = new HackQuestScraper();
    const hackquestResult = await hackquest.run();
    results.push({ name: "HackQuest", ...hackquestResult });
    console.log(`HackQuest: Found ${hackquestResult.found}, Created ${hackquestResult.created}, Updated ${hackquestResult.updated}`);

    // Taikai
    console.log("\n=== Taikai Scraper ===");
    const taikai = new TaikaiScraper();
    const taikaiResult = await taikai.run();
    results.push({ name: "Taikai", ...taikaiResult });
    console.log(`Taikai: Found ${taikaiResult.found}, Created ${taikaiResult.created}, Updated ${taikaiResult.updated}`);

    // Grants
    console.log("\n=== Foundation Grants Scraper ===");
    const grants = new FoundationGrantsScraper();
    const grantResult = await grants.run();
    results.push({ name: "Grants", ...grantResult });
    console.log(`Grants: Found ${grantResult.found}, Created ${grantResult.created}, Updated ${grantResult.updated}`);

    // Summary
    const totalFound = results.reduce((sum, r) => sum + r.found, 0);
    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);

    console.log(`\n[${new Date().toISOString()}] All scrapers completed successfully.`);
    console.log(`Summary: Total Found: ${totalFound}, Created: ${totalCreated}, Updated: ${totalUpdated}`);
  } catch (error) {
    console.error("Scraper error:", error);
  }
}

// Schedule the job
console.log(`Worker started. Scrape schedule: ${SCHEDULE}`);
console.log("Running initial scrape...");

// Run immediately on startup
runAllScrapers().then(() => {
  console.log("Initial scrape completed. Waiting for next scheduled run...");
});

// Schedule subsequent runs
cron.schedule(SCHEDULE, () => {
  runAllScrapers();
});

// Keep the process running
process.on("SIGINT", () => {
  console.log("Worker shutting down...");
  process.exit(0);
});
