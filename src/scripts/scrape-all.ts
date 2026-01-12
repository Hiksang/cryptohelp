import "dotenv/config";
import { EthGlobalScraper } from "./scrapers/hackathons/EthGlobalScraper";
import { DevfolioScraper } from "./scrapers/hackathons/DevfolioScraper";
import { DoraHacksScraper } from "./scrapers/hackathons/DoraHacksScraper";
import { AkindoScraper } from "./scrapers/hackathons/AkindoScraper";
import { TaikaiScraper } from "./scrapers/hackathons/TaikaiScraper";
import { HackQuestScraper } from "./scrapers/hackathons/HackQuestScraper";
import { FoundationGrantsScraper } from "./scrapers/grants/FoundationGrantsScraper";

interface ScraperResult {
  name: string;
  found: number;
  created: number;
  updated: number;
  error?: string;
}

async function runScraper(
  name: string,
  scraperFn: () => Promise<{ found: number; created: number; updated: number }>
): Promise<ScraperResult> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Starting ${name}...`);
  console.log("=".repeat(50));

  try {
    const startTime = Date.now();
    const result = await scraperFn();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ ${name} completed in ${duration}s`);
    console.log(`   Found: ${result.found}, Created: ${result.created}, Updated: ${result.updated}`);

    return { name, ...result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${name} failed: ${errorMessage}`);
    return { name, found: 0, created: 0, updated: 0, error: errorMessage };
  }
}

async function main() {
  console.log("🚀 Starting all scrapers...\n");
  const startTime = Date.now();

  const results: ScraperResult[] = [];

  // Run hackathon scrapers
  console.log("\n📅 HACKATHON SCRAPERS");
  console.log("─".repeat(50));

  results.push(
    await runScraper("ETHGlobal Hackathons", async () => {
      const scraper = new EthGlobalScraper();
      return scraper.run();
    })
  );

  results.push(
    await runScraper("Devfolio Hackathons", async () => {
      const scraper = new DevfolioScraper();
      return scraper.run();
    })
  );

  results.push(
    await runScraper("DoraHacks Hackathons", async () => {
      const scraper = new DoraHacksScraper();
      return scraper.run();
    })
  );

  results.push(
    await runScraper("Akindo Hackathons", async () => {
      const scraper = new AkindoScraper();
      return scraper.run();
    })
  );

  results.push(
    await runScraper("Taikai Hackathons", async () => {
      const scraper = new TaikaiScraper();
      return scraper.run();
    })
  );

  results.push(
    await runScraper("HackQuest Hackathons", async () => {
      const scraper = new HackQuestScraper();
      return scraper.run();
    })
  );

  // Run grant scrapers
  console.log("\n💰 GRANT SCRAPERS");
  console.log("─".repeat(50));

  results.push(
    await runScraper("Foundation Grants", async () => {
      const scraper = new FoundationGrantsScraper();
      return scraper.run();
    })
  );

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const hackathonResults = results.slice(0, 6);
  const grantResults = results.slice(6);

  const hackathonFound = hackathonResults.reduce((sum, r) => sum + r.found, 0);
  const hackathonCreated = hackathonResults.reduce((sum, r) => sum + r.created, 0);
  const hackathonUpdated = hackathonResults.reduce((sum, r) => sum + r.updated, 0);

  const grantFound = grantResults.reduce((sum, r) => sum + r.found, 0);
  const grantCreated = grantResults.reduce((sum, r) => sum + r.created, 0);
  const grantUpdated = grantResults.reduce((sum, r) => sum + r.updated, 0);

  const totalFound = results.reduce((sum, r) => sum + r.found, 0);
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  const failures = results.filter((r) => r.error).length;

  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 SCRAPING SUMMARY");
  console.log("=".repeat(50));
  console.log(`\n📅 Hackathons:`);
  console.log(`   Found: ${hackathonFound}, Created: ${hackathonCreated}, Updated: ${hackathonUpdated}`);
  console.log(`\n💰 Grants:`);
  console.log(`   Found: ${grantFound}, Created: ${grantCreated}, Updated: ${grantUpdated}`);
  console.log(`\n📈 Total:`);
  console.log(`   Duration: ${totalDuration}s`);
  console.log(`   Found: ${totalFound}`);
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Scrapers Run: ${results.length}`);
  console.log(`   Failures: ${failures}`);

  if (failures > 0) {
    console.log("\n⚠️  Failed scrapers:");
    results
      .filter((r) => r.error)
      .forEach((r) => console.log(`   - ${r.name}: ${r.error}`));
  }

  console.log("\n✨ All scrapers finished!");
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
