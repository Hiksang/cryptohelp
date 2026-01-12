import "dotenv/config";
import { DoraHacksScraper } from "../scrapers/hackathons/DoraHacksScraper.js";

async function main() {
  console.log("Starting DoraHacks scraper...");

  const scraper = new DoraHacksScraper();
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
