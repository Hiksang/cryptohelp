import { chromium } from "playwright";

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Screenshot hackathons page
  console.log("Taking screenshot of hackathons page...");
  await page.goto("https://buidltown.hypurrquant.com/hackathons");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "/tmp/hackathons-updated.png", fullPage: false });
  console.log("Screenshot saved: /tmp/hackathons-updated.png");

  // Screenshot grants page
  console.log("\nTaking screenshot of grants page...");
  await page.goto("https://buidltown.hypurrquant.com/grants");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "/tmp/grants-updated.png", fullPage: false });
  console.log("Screenshot saved: /tmp/grants-updated.png");

  await browser.close();
  console.log("\nDone!");
}

takeScreenshots().catch(console.error);
