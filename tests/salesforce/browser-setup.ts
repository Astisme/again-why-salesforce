import puppeteer from "puppeteer";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const USERNAME = Deno.env.get("SALESFORCE_USERNAME")!;
const PASSWORD = Deno.env.get("SALESFORCE_PASSWORD")!;
if (USERNAME == null || PASSWORD == null) {
  console.error("❌ SALESFORCE_USERNAME and SALESFORCE_PASSWORD environment variables required");
  Deno.exit(1);
}

const EXTENSION_NAME = "again-why-salesforce";
let EXTENSION_PATH = "~/gitRepos/again-why-salesforce/";
const MY_INSTANCE = "hatesir-dev-ed.develop";
const SF_LOGIN_URL = `https://${MY_INSTANCE}.my.salesforce.com/`;
const SF_SETUP_URL = `https://${MY_INSTANCE}.lightning.force.com/lightning/setup/SetupOneHome/home`;
const HOME = Deno.env.get("HOME");


/**
 * Detects the current OS and returns the appropriate Chrome executable path
 * 
 * Searches common Chrome installation paths for each platform:
 * - Windows: Program Files, LOCALAPPDATA, environment variables
 * - macOS: .local/bin wrapper, Applications folder
 * - Linux: .local/bin wrapper, system binaries, Chromium
 * 
 * @returns {string|undefined} Path to Chrome executable or undefined for auto-detection
 * @example
 * const chromePath = getChromePath();
 * // Returns: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" on Windows
 * // Returns: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" on macOS
 * // Returns: "/home/user/.local/bin/google-chrome" on Linux
 */
function getChromePath() {
  const platform = Deno.build.os;
  
  if (platform === "windows") {
      // update EXTENSION_PATH
      EXTENSION_PATH = `${HOME}/gitRepos/extensions/again-why-salesforce`
    // Windows paths to try
    const windowsPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${Deno.env.get("LOCALAPPDATA")}\\Google\\Chrome\\Application\\chrome.exe`,
      `${Deno.env.get("PROGRAMFILES")}\\Google\\Chrome\\Application\\chrome.exe`,
      `${Deno.env.get("PROGRAMFILES(X86)")}\\Google\\Chrome\\Application\\chrome.exe`
    ];
    
    for (const path of windowsPaths) {
      try {
        if (path && Deno.statSync(path).isFile) {
          return path;
        }
      } catch {
        continue;
      }
    }
    return undefined; // Let Puppeteer auto-detect
  }
  
  if (platform === "darwin") {
    // macOS paths
    const macPaths = [
      `${HOME}/.local/bin/google-chrome`,
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    ];
    
    for (const path of macPaths) {
      try {
        if (path && Deno.statSync(path).isFile) {
          return path;
        }
      } catch {
        continue;
      }
    }
    return undefined;
  }
  
  // Linux/Unix
  const linuxPaths = [
    `${HOME}/.local/bin/google-chrome`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser"
  ];
  
  for (const path of linuxPaths) {
    try {
      if (path && Deno.statSync(path).isFile) {
        return path;
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

console.log("🚀 Starting browser setup...");
const browser = await puppeteer.launch({
  executablePath: getChromePath(),
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
    "--remote-debugging-port=9222", // Enable remote debugging
    "--enable-extensions",
    "--enable-extension-apis",
  ],
  timeout: 30000,
});

async function waitForExtension(browser, timeout = 17000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const targets = await browser.targets();
        console.log(targets)
        const extensionTarget = targets.find(
            target => target.type() === "background_page" || target.type() === "service_worker"
        );
        if (extensionTarget) {
            return extensionTarget;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error("Extension background page not found");
}


try {
    const extensionTarget = await waitForExtension(browser);
    const extensionUrl = extensionTarget.url();
    const extensionId = extensionUrl.split("/")[2]; // "chrome-extension://<id>/..."
    const optionsUrl = `chrome-extension://${extensionId}/options.html`;
    const page = await browser.newPage();
    await page.goto(optionsUrl);
    console.log('okopt')
    throw new Error('okopt')

  console.log("🔐 Logging into Salesforce...");
  await page.goto(SF_LOGIN_URL);
  await page.waitForSelector("#username");
  await page.type("#username", USERNAME);
  await page.type("#password", PASSWORD);
  await page.click("#Login");
  console.log("⏳ Waiting for login...");
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  // Setup console monitoring
  /*
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
  */
  console.log("📋 Navigating to setup page...");
  await page.goto(SF_SETUP_URL);
  await page.waitForSelector(`#${EXTENSION_NAME}`);
  console.log("✅ Browser ready for testing!");
  // Keep browser open
  //setTimeout(browser.close, 30000);
  //await new Promise(()=>{});

  // Write browser endpoint info for tests to connect
  const browserWSEndpoint = browser.wsEndpoint();
  await Deno.writeTextFile("/tmp/browser-endpoint", browserWSEndpoint);
  console.log(`Browser WebSocket endpoint: ${browserWSEndpoint}`);

  // Keep browser alive until tests complete
  // Listen for SIGTERM to gracefully close
  let shouldExit = false;
  Deno.addSignalListener("SIGTERM", () => {
    shouldExit = true;
    browser.close();
  });
  while (!shouldExit) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  await browser.close();
} catch (error) {
  console.error("❌ Setup failed:", error);
  await browser.close();
  Deno.exit(1);
}
