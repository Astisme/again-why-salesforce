import puppeteer from "puppeteer";
console.log('favman');

const EXTENSION_NAME = "again-why-salesforce";
const MY_INSTANCE = "hatesir-dev-ed.develop";
const SF_SETUP_URL = `https://${MY_INSTANCE}.lightning.force.com/lightning/setup/SetupOneHome/home`;
const EXT_BUTTON_ID = `#${EXTENSION_NAME}-button`;
const EXT_STAR_ID = `#${EXTENSION_NAME}-star`;
const EXT_SLASHED_STAR_ID = `#${EXTENSION_NAME}-slashed-star`;

// Read browser endpoint from setup script
let browserWSEndpoint;
try {
  browserWSEndpoint = await Deno.readTextFile("/tmp/browser-endpoint");
} catch {
  throw new Error("Browser not started. Run 'deno task start-browser' first");
}

const browser = await puppeteer.connect({ 
  browserWSEndpoint
});

const pages = await browser.pages();
const page = pages.find(p => p.url().includes(MY_INSTANCE)) || await browser.newPage();

if (!page.url().includes("SetupOneHome")) {
  await page.goto(SF_SETUP_URL);
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

Deno.test("Star Toggle Functionality", async () => {
  
  // Verify extension button exists
  const buttonExists = await page.$(EXT_BUTTON_ID);
  if (!buttonExists) {
    throw new Error(`Extension button ${EXT_BUTTON_ID} not found`);
  }
  console.log(buttonExists);
  
  // Get initial states
  const initialStarVisible = await page.$(EXT_STAR_ID).then(el => el?.isIntersectingViewport());
  const initialSlashedVisible = await page.$(EXT_SLASHED_STAR_ID).then(el => el?.isIntersectingViewport());
  
  // Test first toggle
  await page.click(initialStarVisible ? EXT_STAR_ID : EXT_SLASHED_STAR_ID);
  await page.waitForTimeout(300);
  
  const afterToggleStarVisible = await page.$(EXT_STAR_ID).then(el => el?.isIntersectingViewport());
  const afterToggleSlashedVisible = await page.$(EXT_SLASHED_STAR_ID).then(el => el?.isIntersectingViewport());
  
  // Verify state changed
  if (initialStarVisible === afterToggleStarVisible) {
    throw new Error("Star state did not toggle");
  }
  
  // Test reverse toggle
  await page.click(afterToggleStarVisible ? EXT_STAR_ID : EXT_SLASHED_STAR_ID);
  await page.waitForTimeout(300);
  
  const finalStarVisible = await page.$(EXT_STAR_ID).then(el => el?.isIntersectingViewport());
  const finalSlashedVisible = await page.$(EXT_SLASHED_STAR_ID).then(el => el?.isIntersectingViewport());
  
  // Verify back to original state
  if (initialStarVisible !== finalStarVisible || initialSlashedVisible !== finalSlashedVisible) {
    throw new Error("Toggle did not return to original state");
  }
  
  console.log("✅ Star toggle test passed");
});
