import "dotenv/config";
import cron from "node-cron";
import { EthGlobalScraper } from "./scrapers/hackathons/EthGlobalScraper.js";
import { DevfolioScraper } from "./scrapers/hackathons/DevfolioScraper.js";
import { FoundationGrantsScraper } from "./scrapers/grants/FoundationGrantsScraper.js";

const SCHEDULE = process.env.SCRAPE_SCHEDULE || "0 0 * * *"; // Default: daily at midnight

async function runAllScrapers() {
  console.log(`[${new Date().toISOString()}] Starting all scrapers...`);

  try {
    // ETHGlobal
    console.log("Running ETHGlobal scraper...");
    const ethGlobal = new EthGlobalScraper();
    const ethResult = await ethGlobal.run();
    console.log(`ETHGlobal: Found ${ethResult.found}, Created ${ethResult.created}, Updated ${ethResult.updated}`);

    // Devfolio
    console.log("Running Devfolio scraper...");
    const devfolio = new DevfolioScraper();
    const devResult = await devfolio.run();
    console.log(`Devfolio: Found ${devResult.found}, Created ${devResult.created}, Updated ${devResult.updated}`);

    // Grants
    console.log("Running Grants scraper...");
    const grants = new FoundationGrantsScraper();
    const grantResult = await grants.run();
    console.log(`Grants: Found ${grantResult.found}, Created ${grantResult.created}, Updated ${grantResult.updated}`);

    console.log(`[${new Date().toISOString()}] All scrapers completed successfully.`);
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
