import puppeteer from "puppeteer";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const EXTENSION_NAME = "again-why-salesforce";
const EXTENSION_PATH = "~/gitRepos/again-why-salesforce/";
const MY_INSTANCE = "hatesir-dev-ed.develop";
const SF_LOGIN_URL = `https://${MY_INSTANCE}.my.salesforce.com/`;
const SF_SETUP_URL = `https://${MY_INSTANCE}.lightning.force.com/lightning/setup/SetupOneHome/home`;
const USERNAME = Deno.env.get("SALESFORCE_USERNAME")!;
const PASSWORD = Deno.env.get("SALESFORCE_PASSWORD")!;

if (USERNAME == null || PASSWORD == null) {
  console.error("❌ SALESFORCE_USERNAME and SALESFORCE_PASSWORD environment variables required");
  Deno.exit(1);
}

console.log("🚀 Starting browser setup...");
const browser = await puppeteer.launch({
  headless: false,
  args: [
    `--load-extension=${EXTENSION_PATH}`,
    `--disable-extensions-except=${EXTENSION_PATH}`,
    "--window-size=1280,800",
    "--no-first-run",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--enable-features=NavigatorDoNotTrack",
  ]
});

try {
  console.log("🔐 Logging into Salesforce...");
  const page = await browser.newPage();
  await page.goto(SF_LOGIN_URL);
  await page.waitForSelector("#username");
  await page.type("#username", USERNAME);
  await page.type("#password", PASSWORD);
  await page.click("#Login");
  console.log("⏳ Waiting for login...");
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  // Setup console monitoring
  page.on('console', msg => {
    console.log(`[PAGE ${msg.type()}] ${msg.text()}`);
  });
  // Monitor extension background page console
  const targets = await browser.targets();
  for (const target of targets) {
    if (target.type() === "background_page") {
      try {
        const bgPage = await target.page();
        if (bgPage) {
          bgPage.on('console', msg => {
            console.log(`[EXTENSION ${msg.type()}] ${msg.text()}`);
          });
        }
      } catch (e) {
        console.log("Could not access background page:", e.message);
      }
    }
  }
  console.log("📋 Navigating to setup page...");
  await page.goto(SF_SETUP_URL);
  await page.waitForSelector(`#${EXTENSION_NAME}`);
  console.log("✅ Browser ready for testing!");
  // Keep browser open
  setTimeout(browser.close, 30000);
} catch (error) {
  console.error("❌ Setup failed:", error);
  await browser.close();
  Deno.exit(1);
}
