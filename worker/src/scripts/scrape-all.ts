import "dotenv/config";
import { EthGlobalScraper } from "../scrapers/hackathons/EthGlobalScraper.js";
import { DevfolioScraper } from "../scrapers/hackathons/DevfolioScraper.js";
import { FoundationGrantsScraper } from "../scrapers/grants/FoundationGrantsScraper.js";

async function main() {
  console.log("Starting all scrapers...\n");

  // ETHGlobal
  console.log("=== ETHGlobal Scraper ===");
  const ethGlobal = new EthGlobalScraper();
  const ethResult = await ethGlobal.run();
  console.log(`Found: ${ethResult.found}, Created: ${ethResult.created}, Updated: ${ethResult.updated}\n`);

  // Devfolio
  console.log("=== Devfolio Scraper ===");
  const devfolio = new DevfolioScraper();
  const devResult = await devfolio.run();
  console.log(`Found: ${devResult.found}, Created: ${devResult.created}, Updated: ${devResult.updated}\n`);

  // Grants
  console.log("=== Foundation Grants Scraper ===");
  const grants = new FoundationGrantsScraper();
  const grantResult = await grants.run();
  console.log(`Found: ${grantResult.found}, Created: ${grantResult.created}, Updated: ${grantResult.updated}\n`);

  console.log("All scrapers completed!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Scraper failed:", error);
  process.exit(1);
});
