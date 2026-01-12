import "dotenv/config";
import { EthGlobalScraper } from "./scrapers/hackathons/EthGlobalScraper";

async function main() {
  console.log("Starting ETHGlobal scraper...");

  const scraper = new EthGlobalScraper();
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
