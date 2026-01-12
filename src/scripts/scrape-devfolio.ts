import "dotenv/config";
import { DevfolioScraper } from "./scrapers/hackathons/DevfolioScraper";

async function main() {
  console.log("Starting Devfolio scraper...");

  const scraper = new DevfolioScraper();
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
