// deno run -A --unstable test_salesforce_extension.ts

import puppeteer from "npm:puppeteer";
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { existsSync } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { EXTENSION_NAME } from "/constants.js";

//const EXTENSION_PATH = "../../../../../gitRepos/extensions/again-why-salesforce/"; // only windows needs this nonsense
const EXTENSION_PATH = "~/gitRepos/again-why-salesforce/";

const MY_INSTANCE = "hatesir-dev-ed.develop";
const SF_LOGIN_URL = `https://${MY_INSTANCE}.my.salesforce.com/`;
const SF_SETUP_URL =
	`https://${MY_INSTANCE}.lightning.force.com/lightning/setup/SetupOneHome/home`;

const USERNAME = Deno.env.get("SALESFORCE_USERNAME")!;
const PASSWORD = Deno.env.get("SALESFORCE_PASSWORD")!;

const EXT_BUTTON_ID = `#${EXTENSION_NAME}-button`;
const EXT_STAR_ID = `#${EXTENSION_NAME}-star`;
const EXT_SLASHED_STAR_ID = `#${EXTENSION_NAME}-slashed-star`;

let browser: puppeteer.Browser;
let page: puppeteer.Page;
let retries: integer = 0;

async function launchBrowser() {
    await new Deno.Command("deno", {
        args: ["task", "dev-chrome"],
    }).output();
	browser = await puppeteer.launch({
		headless: false,
		args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
			`--load-extension=${EXTENSION_PATH}`,
			"--window-size=1280,800",
		],
		defaultViewport: null,
	});
	const pages = await browser.pages();
	page = pages[0];
}

async function loginToSalesforce() {
	await page.goto(SF_LOGIN_URL, { waitUntil: "networkidle2" });
	await page.waitForSelector("#username", { timeout: 15000 });
    // perform login
	await page.type("#username", USERNAME);
	await page.type("#password", PASSWORD);
	await page.click("#Login");
	await page.waitForNavigation({ waitUntil: "networkidle2" });
    // check page was logged in
	if (page.url() === SF_LOGIN_URL) {
      if(retries < 3){
        console.log('retrying',retries)
        retries++;
        await launchAndLogin();
        return;
      }
      else
		throw new Error("❌ Login failed. Check credentials.");
	}
	console.log("✅ Logged in");
}

async function reloadExtension(){
  await page.goto("chrome://extensions/", { waitUntil: "networkidle2" });
  await page.click("#devMode");
  await page.click("#dev-reload-button");
}

async function openSetupPage() {
const workerTarget = await browser.waitForTarget(
  target =>
    target.type() === 'service_worker' &&
    target.url().endsWith('background.js'),
);
//const worker = await workerTarget.worker();
console.log({workerTarget})
  const client = await workerTarget.createCDPSession();
  // Listen for console messages
  await client.send("Log.enable");
  client.on("Log.entryAdded", (entry) => {
    console.log("[EXTENSION LOG]", entry.entry.text);
  });
  // Listen for runtime exceptions
  await client.send("Runtime.enable");
  client.on("Runtime.exceptionThrown", (event) => {
    console.error("[EXTENSION ERROR]", event.exceptionDetails.text);
  });
page.on("console", (msg) => console.log("[CONTENT LOG]", msg.text()));
page.on("pageerror", (err) => console.error("[CONTENT ERROR]", err));
	await page.goto(SF_SETUP_URL, { waitUntil: "networkidle2" });
	await page.waitForSelector(`#${EXTENSION_NAME}`, { timeout: 15000000 });
}

async function testFavouriteButton() {
	await page.waitForSelector(EXT_BUTTON_ID, { timeout: 15000 });

	// Click "Favourite" button
	await page.click(EXT_BUTTON_ID);

	// Wait for star icon and verify it's visible
	await page.waitForSelector(EXT_STAR_ID, { timeout: 10000 });

	const starVisible = await page.$eval(EXT_STAR_ID, (el) => {
		return window.getComputedStyle(el).display !== "none";
	});

	if (starVisible) {
		console.log("🌟 Favourite button toggled correctly.");
	} else {
		throw new Error("❌ Star icon not visible after toggle.");
	}
}

async function launchAndLogin(){
	await launchBrowser();
	await loginToSalesforce();
    await reloadExtension();
}

try {
  await launchAndLogin();
	await openSetupPage();
	await testFavouriteButton();
} catch (e) {
	console.error("Test failed:", e);
} finally {
	if (browser) await browser.close();
}
