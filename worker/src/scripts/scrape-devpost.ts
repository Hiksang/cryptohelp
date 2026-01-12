import "dotenv/config";
import { DevpostScraper } from "../scrapers/hackathons/DevpostScraper.js";

async function main() {
  console.log("Starting Devpost scraper...");

  const scraper = new DevpostScraper();
  const result = await scraper.run();

  console.log("Scraping completed:");
  console.log(`  Found: ${result.found}`);
  console.log(`  Created: ${result.created}`);
  console.log(`  Updated: ${result.updated}`);

  process.exit(0);
}

main().catch((error) => {
  console.error("Scraper failed:", error);
  process.exit(1);
});
