import { chromium } from "playwright";

async function debugEthGlobal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Check a specific ETHGlobal event page
  const url = "https://ethglobal.com/events/bangkok";
  console.log(`Fetching ${url}...`);

  await page.goto(url, { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded");

  // Get all text content
  const bodyText = await page.textContent("body") || "";

  // Look for date-like patterns
  console.log("\n=== Looking for date patterns ===");

  // Find lines containing month names
  const months = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December",
                  "Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (const month of months) {
    const regex = new RegExp(`${month}[^\\n]{0,50}`, "gi");
    const matches = bodyText.match(regex);
    if (matches) {
      console.log(`Found "${month}":`, matches.slice(0, 3));
    }
  }

  // Check for specific date elements
  console.log("\n=== Checking date elements ===");

  const dateSelectors = [
    "time",
    "[datetime]",
    "[class*='date']",
    "[class*='Date']",
    "[class*='when']",
    "[class*='When']",
  ];

  for (const selector of dateSelectors) {
    const elements = await page.$$(selector);
    if (elements.length > 0) {
      console.log(`\nFound ${elements.length} elements with selector: ${selector}`);
      for (const el of elements.slice(0, 3)) {
        const text = await el.textContent();
        const datetime = await el.getAttribute("datetime");
        console.log(`  Text: "${text?.trim()}", datetime: "${datetime}"`);
      }
    }
  }

  // Check JSON-LD
  console.log("\n=== Checking JSON-LD ===");
  const scripts = await page.$$eval("script[type='application/ld+json']", els =>
    els.map(el => el.textContent)
  );
  for (const script of scripts) {
    if (script) {
      console.log("JSON-LD:", script.substring(0, 500));
    }
  }

  // Check meta tags
  console.log("\n=== Checking meta tags ===");
  const metas = await page.$$eval("meta", els =>
    els.map(el => ({ name: el.getAttribute("name"), property: el.getAttribute("property"), content: el.getAttribute("content") }))
      .filter(m => m.content && (m.name?.includes("date") || m.property?.includes("date") || m.content?.match(/\d{4}/)))
  );
  console.log("Date-related meta tags:", metas.slice(0, 5));

  // Look for specific patterns in the page
  console.log("\n=== Raw date patterns ===");
  const datePatterns = bodyText.match(/\d{1,2}\s*[-–]\s*\d{1,2},?\s*\d{4}/g);
  console.log("Numeric date patterns:", datePatterns?.slice(0, 5));

  const monthDatePatterns = bodyText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}[^0-9]{0,30}\d{4}/gi);
  console.log("Month date patterns:", monthDatePatterns?.slice(0, 5));

  await browser.close();
}

debugEthGlobal().catch(console.error);
