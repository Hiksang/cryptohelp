import "dotenv/config";
import { EthGlobalScraper } from "../scrapers/hackathons/EthGlobalScraper.js";
import { DevfolioScraper } from "../scrapers/hackathons/DevfolioScraper.js";
import { DoraHacksScraper } from "../scrapers/hackathons/DoraHacksScraper.js";
import { AkindoScraper } from "../scrapers/hackathons/AkindoScraper.js";
import { DevpostScraper } from "../scrapers/hackathons/DevpostScraper.js";
import { HackQuestScraper } from "../scrapers/hackathons/HackQuestScraper.js";
import { TaikaiScraper } from "../scrapers/hackathons/TaikaiScraper.js";
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

  // DoraHacks
  console.log("=== DoraHacks Scraper ===");
  const doraHacks = new DoraHacksScraper();
  const doraResult = await doraHacks.run();
  console.log(`Found: ${doraResult.found}, Created: ${doraResult.created}, Updated: ${doraResult.updated}\n`);

  // Akindo
  console.log("=== Akindo Scraper ===");
  const akindo = new AkindoScraper();
  const akindoResult = await akindo.run();
  console.log(`Found: ${akindoResult.found}, Created: ${akindoResult.created}, Updated: ${akindoResult.updated}\n`);

  // Devpost
  console.log("=== Devpost Scraper ===");
  const devpost = new DevpostScraper();
  const devpostResult = await devpost.run();
  console.log(`Found: ${devpostResult.found}, Created: ${devpostResult.created}, Updated: ${devpostResult.updated}\n`);

  // HackQuest
  console.log("=== HackQuest Scraper ===");
  const hackquest = new HackQuestScraper();
  const hackquestResult = await hackquest.run();
  console.log(`Found: ${hackquestResult.found}, Created: ${hackquestResult.created}, Updated: ${hackquestResult.updated}\n`);

  // Taikai
  console.log("=== Taikai Scraper ===");
  const taikai = new TaikaiScraper();
  const taikaiResult = await taikai.run();
  console.log(`Found: ${taikaiResult.found}, Created: ${taikaiResult.created}, Updated: ${taikaiResult.updated}\n`);

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
