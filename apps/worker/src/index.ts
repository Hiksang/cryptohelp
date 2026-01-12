import { Queue, Worker } from "bullmq";
import { EthGlobalScraper } from "./scrapers/hackathons/EthGlobalScraper.js";
import { DevfolioScraper } from "./scrapers/hackathons/DevfolioScraper.js";
import { supabase } from "./config/supabase.js";

// Redis connection config
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = {
  host: new URL(redisUrl).hostname,
  port: parseInt(new URL(redisUrl).port || "6379"),
  maxRetriesPerRequest: null,
};

// Scraper registry
const scraperRegistry = {
  hackathons: {
    ethglobal: new EthGlobalScraper(),
    devfolio: new DevfolioScraper(),
  },
  grants: {},
};

// Create job queue
const scrapeQueue = new Queue("scrape-jobs", { connection });

// Create worker
const worker = new Worker(
  "scrape-jobs",
  async (job) => {
    const { source, entityType } = job.data as {
      source: string;
      entityType: "hackathon" | "grant";
    };

    console.log(`Starting scrape job: ${entityType}/${source}`);
    const startTime = Date.now();

    // Record job start
    const { data: jobRecord } = await supabase
      .from("scrape_jobs")
      .insert({
        source,
        entity_type: entityType,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      let result = { found: 0, created: 0, updated: 0 };

      if (entityType === "hackathon") {
        const scraper = scraperRegistry.hackathons[source as keyof typeof scraperRegistry.hackathons];
        if (scraper) {
          result = await scraper.run();
        } else {
          throw new Error(`Unknown hackathon source: ${source}`);
        }
      } else if (entityType === "grant") {
        const scraper = scraperRegistry.grants[source as keyof typeof scraperRegistry.grants];
        if (scraper) {
          result = await (scraper as { run: () => Promise<typeof result> }).run();
        } else {
          throw new Error(`Unknown grant source: ${source}`);
        }
      }

      const duration = Date.now() - startTime;

      // Update job record
      await supabase
        .from("scrape_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          items_found: result.found,
          items_created: result.created,
          items_updated: result.updated,
          items_unchanged: result.found - result.created - result.updated,
        })
        .eq("id", jobRecord?.id);

      console.log(
        `Completed scrape job: ${entityType}/${source} - Found: ${result.found}, Created: ${result.created}, Updated: ${result.updated}`
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update job record with error
      await supabase
        .from("scrape_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          error_message: errorMessage,
          error_stack: error instanceof Error ? error.stack : undefined,
        })
        .eq("id", jobRecord?.id);

      console.error(`Failed scrape job: ${entityType}/${source} - ${errorMessage}`);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000, // Max 5 jobs per minute
    },
  }
);

// Schedule recurring jobs
async function initializeSchedules() {
  console.log("Initializing scrape schedules...");

  // Clear existing repeatable jobs
  const existingJobs = await scrapeQueue.getRepeatableJobs();
  for (const job of existingJobs) {
    await scrapeQueue.removeRepeatableByKey(job.key);
  }

  // Hackathon scrapers
  const hackathonSchedules = [
    { source: "ethglobal", pattern: "0 */6 * * *" }, // Every 6 hours
    { source: "devfolio", pattern: "0 */4 * * *" }, // Every 4 hours
  ];

  for (const schedule of hackathonSchedules) {
    await scrapeQueue.add(
      "scrape-hackathons",
      { source: schedule.source, entityType: "hackathon" },
      {
        repeat: { pattern: schedule.pattern },
        jobId: `hackathon-${schedule.source}`,
      }
    );
    console.log(`Scheduled hackathon scraper: ${schedule.source} - ${schedule.pattern}`);
  }

  console.log("Scrape schedules initialized");
}

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down worker...");
  await worker.close();
  await scrapeQueue.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start worker
console.log("Starting CryptoHelp worker...");
initializeSchedules().catch(console.error);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

console.log("Worker started and listening for jobs");
