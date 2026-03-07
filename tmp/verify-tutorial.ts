import puppeteer from "puppeteer";

const username = Deno.env.get("SALESFORCE_USERNAME");
const password = Deno.env.get("SALESFORCE_PASSWORD");
if (!username || !password) {
	throw new Error("Missing Salesforce credentials in environment");
}

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const extensionPath = Deno.cwd();
const loginUrl = "https://hatesir-dev-ed.develop.my.salesforce.com/";
const setupUrl =
	"https://hatesir-dev-ed.develop.lightning.force.com/lightning/setup/SetupOneHome/home";

const browser = await puppeteer.launch({
	executablePath: chromePath,
	headless: false,
	args: [
		`--load-extension=${extensionPath}`,
		`--disable-extensions-except=${extensionPath}`,
		"--window-size=1440,1000",
		"--no-first-run",
		"--enable-extensions",
		"--enable-extension-apis",
	],
	defaultViewport: { width: 1440, height: 1000 },
});

async function dump(page, label) {
	const info = await page.evaluate(() => ({
		url: location.href,
		title: document.title,
		body: document.body?.innerText?.replace(/\s+/g, " ").slice(0, 600) ??
			"",
		tutorial: Boolean(document.querySelector(".awsf-tutorial")),
		setupTab: Boolean(document.querySelector("#again-why-salesforce")),
	}));
	console.log(`${label}:${JSON.stringify(info)}`);
}

try {
	const page = await browser.newPage();
	page.on("dialog", async (dialog) => {
		console.log(`dialog:${dialog.type()}:${dialog.message()}`);
		await dialog.accept();
	});

	await page.goto(loginUrl, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await page.waitForSelector("#username", { timeout: 30000 });
	await page.click("#username", { clickCount: 3 });
	await page.type("#username", username, { delay: 30 });
	await page.click("#password", { clickCount: 3 });
	await page.type("#password", password, { delay: 30 });
	await page.$eval("#Login", (button) => button.click());
	await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 })
		.catch(() => null);
	await dump(page, "after-login");

	if (
		page.url().includes("Login") || (await page.title()).includes("Login")
	) {
		throw new Error(
			"Still on Salesforce login page after credential submit",
		);
	}

	await page.goto(setupUrl, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 })
		.catch(() => null);
	await page.waitForFunction(
		() => location.hostname.includes("lightning.force.com"),
		{ timeout: 60000 },
	);
	await dump(page, "after-setup-nav");

	await page.waitForFunction(
		() => Boolean(document.querySelector(".awsf-tutorial")),
		{ timeout: 30000 },
	);

	const details = await page.evaluate(() => {
		const root = document.querySelector(".awsf-tutorial");
		const pill = document.querySelector(".awsf-tutorial-pill");
		const shortcut = document.querySelector(".awsf-tutorial-pill-shortcut");
		const highlight = document.querySelector(".awsf-tutorial-highlight");
		if (!(root instanceof HTMLElement)) {
			throw new Error("Tutorial root not found");
		}
		const rootStyle = getComputedStyle(root);
		return {
			className: root.className,
			borderColor: rootStyle.borderColor,
			backgroundImage: rootStyle.backgroundImage,
			boxShadow: rootStyle.boxShadow,
			animationName: rootStyle.animationName,
			pillClass: pill?.className ?? null,
			shortcutClass: shortcut?.className ?? null,
			highlightClass: highlight?.className ?? null,
			text: root.textContent?.replace(/\s+/g, " ").trim() ?? "",
		};
	});

	const screenshotPath = `${Deno.cwd()}\\tmp\\tutorial-live.png`;
	await page.screenshot({ path: screenshotPath, fullPage: true });
	console.log(JSON.stringify({ screenshotPath, details }, null, 2));
} finally {
	await browser.close();
}
