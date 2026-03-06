import puppeteer from "puppeteer";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

export const EXTENSION_NAME = "again-why-salesforce";
export const MY_INSTANCE = "hatesir-dev-ed.develop";
export const SF_LOGIN_URL = `https://${MY_INSTANCE}.my.salesforce.com/`;
export const SF_SETUP_HOME_URL =
	`https://${MY_INSTANCE}.my.salesforce-setup.com/lightning/setup/SetupOneHome/home`;
export const SF_FAVOURITE_TEST_URL =
	`https://${MY_INSTANCE}.my.salesforce-setup.com/lightning/setup/Flows/home`;
export const EXTENSION_ROOT_ID = `#${EXTENSION_NAME}`;
export const EXTENSION_BUTTON_ID = `#${EXTENSION_NAME}-button`;

const DEFAULT_PROFILE_DIR = "./tests/salesforce/chrome-profile";
const MANUAL_AUTH_TIMEOUT_MS = 300000;
const TUTORIAL_STORAGE_KEY = "tutorial-progress";
const WHAT_SET = "set";
const WHAT_START_TUTORIAL = "start-tutorial";
const CXM_EMPTY_TABS = "empty-tabs";
const USERNAME = Deno.env.get("SALESFORCE_USERNAME");
const PASSWORD = Deno.env.get("SALESFORCE_PASSWORD");
const IS_CI = (Deno.env.get("CI") ?? "").toLowerCase() === "true";
const GITHUB_CHANGELOG_URL =
	"https://github.com/Astisme/again-why-salesforce/blob/main/docs/CHANGELOG.md";

export function getChromePath() {
	const platform = Deno.build.os;
	const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
	const localAppData = Deno.env.get("LOCALAPPDATA") ?? "";

	const chromePaths = platform === "windows"
		? [
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
			`${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
		]
		: platform === "darwin"
		? [
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			`${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
		]
		: [
			`${home}/.local/bin/google-chrome`,
			"/usr/bin/google-chrome",
			"/usr/bin/chromium-browser",
			"/usr/bin/chromium",
		];

	for (const path of chromePaths) {
		if (!path) {
			continue;
		}
		try {
			if (Deno.statSync(path).isFile) {
				return path;
			}
		} catch {
			continue;
		}
	}
	return undefined;
}

export function getExtensionPath() {
	return Deno.realPathSync("./src");
}

export async function getUserDataDir() {
	const profileDirInput = Deno.env.get("SALESFORCE_CHROME_PROFILE_DIR") ??
		DEFAULT_PROFILE_DIR;
	await Deno.mkdir(profileDirInput, { recursive: true });
	return Deno.realPathSync(profileDirInput);
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSalesforceUrl(url: string) {
	return url.includes(MY_INSTANCE) ||
		url.includes(".my.salesforce.com") ||
		url.includes(".my.salesforce-setup.com") ||
		url.includes(".lightning.force.com");
}

async function closeInstallTabs(browser) {
	for (const page of await browser.pages()) {
		const url = page.url();
		if (
			url === GITHUB_CHANGELOG_URL ||
			url.startsWith("https://github.com/Astisme/again-why-salesforce")
		) {
			await page.close().catch(() => null);
		}
	}
}

async function getExtensionWorker(browser) {
	const target = await browser.waitForTarget(
		(target) =>
			target.type() === "service_worker" &&
			target.url().startsWith("chrome-extension://"),
		{ timeout: 30000 },
	);
	const worker = await target.worker();
	if (worker == null) {
		throw new Error("Extension service worker not available");
	}
	return worker;
}

async function sendRuntimeMessageFromWorker(browser, message) {
	const worker = await getExtensionWorker(browser);
	const response = await worker.evaluate(
		(request) =>
			new Promise((resolve) => {
				const runtime = globalThis.chrome?.runtime;
				if (runtime?.sendMessage == null) {
					resolve({
						ok: false,
						error: "runtime.sendMessage unavailable in worker context",
					});
					return;
				}
				runtime.sendMessage(request, () => {
					const error = runtime.lastError?.message ?? null;
					resolve({ ok: error == null, error });
				});
			}),
		message,
	);
	return response as { ok: boolean; error?: string | null };
}

async function sendMessageToSalesforceTab(browser, salesforceUrl: string, message) {
	const worker = await getExtensionWorker(browser);
	const response = await worker.evaluate(
		({ expectedUrl, instance, request }) =>
			new Promise((resolve) => {
				const tabs = globalThis.chrome?.tabs;
				if (tabs?.query == null || tabs.sendMessage == null) {
					resolve({
						ok: false,
						error: "tabs API unavailable in worker context",
					});
					return;
				}
				tabs.query({}, (allTabs) => {
					const exactTarget = allTabs.find((tab) => tab.url === expectedUrl);
					const activeTarget = allTabs.find((tab) =>
						tab.active === true &&
						tab.url?.includes(`${instance}.my.salesforce-setup.com`)
					);
					const fallbackTarget = allTabs.find((tab) =>
						tab.url?.includes(`${instance}.my.salesforce-setup.com`)
					);
					const target = exactTarget ?? activeTarget ?? fallbackTarget;
					if (target?.id == null) {
						resolve({
							ok: false,
							error: `No Salesforce tab found for ${expectedUrl}`,
						});
						return;
					}
					tabs.sendMessage(target.id, request, () => {
						const error = globalThis.chrome?.runtime?.lastError?.message ??
							null;
						resolve({ ok: error == null, error });
					});
				});
			}),
		{
			expectedUrl: salesforceUrl,
			instance: MY_INSTANCE,
			request: message,
		},
	);
	return response as { ok: boolean; error?: string | null };
}

export async function resetTutorialProgress(browser) {
	const response = await sendRuntimeMessageFromWorker(browser, {
		what: WHAT_SET,
		key: TUTORIAL_STORAGE_KEY,
		set: null,
	});
	if (response?.ok !== true) {
		throw new Error(
			`Failed to reset tutorial progress: ${response?.error ?? "unknown error"}`,
		);
	}
}

export async function startTutorialFromWorker(browser, salesforceUrl: string) {
	const emptyTabsResponse = await sendMessageToSalesforceTab(
		browser,
		salesforceUrl,
		{ what: CXM_EMPTY_TABS },
	);
	if (emptyTabsResponse?.ok !== true) {
		throw new Error(
			`Failed to reset tabs before tutorial: ${emptyTabsResponse?.error ?? "unknown error"}`,
		);
	}
	await sleep(600);
	const startResponse = await sendMessageToSalesforceTab(
		browser,
		salesforceUrl,
		{ what: WHAT_START_TUTORIAL },
	);
	if (startResponse?.ok !== true) {
		throw new Error(
			`Failed to start tutorial: ${startResponse?.error ?? "unknown error"}`,
		);
	}
}

export async function getSalesforcePage(browser) {
	await closeInstallTabs(browser);
	const pages = await browser.pages();
	return pages.find((page) => isSalesforceUrl(page.url()) && !page.isClosed()) ??
		pages.find((page) => !page.isClosed()) ??
		await browser.newPage();
}

export async function setFieldValue(page, selector, value, label) {
	await page.waitForSelector(selector, { visible: true, timeout: 30000 });
	await page.$eval(
		selector,
		(element, nextValue) => {
			if (!(element instanceof HTMLInputElement)) {
				throw new Error("Expected input element");
			}
			const descriptor = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			);
			if (descriptor?.set == null) {
				throw new Error("Input value setter unavailable");
			}
			element.focus();
			descriptor.set.call(element, "");
			element.dispatchEvent(new Event("input", { bubbles: true }));
			descriptor.set.call(element, nextValue);
			element.dispatchEvent(new Event("input", { bubbles: true }));
			element.dispatchEvent(new Event("change", { bubbles: true }));
			element.blur();
		},
		value,
	);
	await page.waitForFunction(
		(sel, expected) => {
			const element = document.querySelector(sel);
			return element instanceof HTMLInputElement && element.value === expected;
		},
		{ timeout: 10000 },
		selector,
		value,
	);
	console.log(`${label} entered via native setter`);
	await sleep(400);
}

export async function dumpState(page, label) {
	const state = await page.evaluate(
		(buttonSelector, rootSelector) => ({
			url: location.href,
			title: document.title,
			hasUsername: document.querySelector("#username") instanceof HTMLInputElement,
			hasPassword: document.querySelector("#password") instanceof HTMLInputElement,
			hasVerificationInput: Boolean(
				document.querySelector(
					'input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="code"]',
				),
			),
			hasExtensionRoot: Boolean(document.querySelector(rootSelector)),
			hasExtensionButton: Boolean(document.querySelector(buttonSelector)),
			body: document.body?.innerText?.replace(/\s+/g, " ").slice(0, 500) ?? "",
		}),
		EXTENSION_BUTTON_ID,
		EXTENSION_ROOT_ID,
	);
	console.log(`${label}:${JSON.stringify(state, null, 2)}`);
	return state;
}

async function waitForManualAuthCompletion(page) {
	if (IS_CI) {
		throw new Error(
			"Salesforce requires interactive verification. In CI provide a pre-authenticated profile via SALESFORCE_CHROME_PROFILE_DIR.",
		);
	}
	console.error(
		`Waiting up to ${MANUAL_AUTH_TIMEOUT_MS}ms for manual Salesforce verification in the persistent test profile...`,
	);
	await page.waitForFunction(
		() => {
			const hasLoginInputs = document.querySelector("#username") ||
				document.querySelector("#password");
			const hasOtpInputs = document.querySelector(
				'input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="code"]',
			);
			return !hasLoginInputs && !hasOtpInputs;
		},
		{ timeout: MANUAL_AUTH_TIMEOUT_MS },
	);
}

export async function ensureAuthenticated(page) {
	if (USERNAME == null || PASSWORD == null) {
		throw new Error(
			"SALESFORCE_USERNAME and SALESFORCE_PASSWORD environment variables required",
		);
	}
	await page.goto(SF_LOGIN_URL, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	const hasLoginInputs = await page.$("#username") != null &&
		await page.$("#password") != null;
	if (!hasLoginInputs) {
		console.log(
			"Reusing existing authenticated Salesforce session from persistent profile",
		);
		return;
	}
	await setFieldValue(page, "#username", USERNAME, "username");
	await setFieldValue(page, "#password", PASSWORD, "password");
	await page.$eval("#Login", (button) => {
		if (!(button instanceof HTMLElement)) {
			throw new Error("Salesforce login button not found");
		}
		button.click();
	});
	await page.waitForNavigation({
		waitUntil: "domcontentloaded",
		timeout: 60000,
	}).catch(() => null);
	const stillNeedsAuth = await page.$("#username") != null ||
		await page.$("#password") != null ||
		await page.evaluate(() =>
			Boolean(
				document.querySelector(
					'input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="code"]',
				),
			)
		);
	if (stillNeedsAuth) {
		await dumpState(page, "post-login-still-auth");
		await waitForManualAuthCompletion(page);
	}
}

export async function openSetupHome(page) {
	await page.goto(SF_SETUP_HOME_URL, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
}

export async function openFavouriteTestPage(page) {
	await page.goto(SF_FAVOURITE_TEST_URL, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
}

export async function ensureExtensionLoaded(page) {
	await openSetupHome(page);
	await sleep(3000);
	await page.waitForSelector(EXTENSION_ROOT_ID, { timeout: 60000 }).catch(
		async () => {
			await dumpState(page, "extension-root-missing");
			throw new Error(
				`Extension root ${EXTENSION_ROOT_ID} not found on Salesforce Setup home. Verify the unpacked extension at ${getExtensionPath()}.`,
			);
		},
	);
}

export async function ensureFavouriteButtonVisible(page) {
	await openFavouriteTestPage(page);
	await sleep(3000);
	await page.waitForSelector(EXTENSION_BUTTON_ID, { timeout: 60000 }).catch(
		async () => {
			await dumpState(page, "extension-button-missing");
			throw new Error(
				`Extension UI ${EXTENSION_BUTTON_ID} not found on ${SF_FAVOURITE_TEST_URL}.`,
			);
		},
	);
}

export async function launchSalesforceBrowser() {
	const browser = await puppeteer.launch({
		browser: "chrome",
		executablePath: getChromePath(),
		headless: false,
		pipe: true,
		enableExtensions: [getExtensionPath()],
		userDataDir: await getUserDataDir(),
		defaultViewport: null,
		args: [
			"--window-size=1440,1000",
			"--no-first-run",
		],
		timeout: 30000,
	});
	const page = await getSalesforcePage(browser);
	return { browser, page };
}

export async function createReadySalesforceSession(
	{
		dialogAction = "dismiss",
		resetTutorial = false,
		startTutorial = false,
	}: {
		dialogAction?: "accept" | "dismiss";
		resetTutorial?: boolean;
		startTutorial?: boolean;
	} = {},
) {
	const { browser, page } = await launchSalesforceBrowser();
	page.removeAllListeners("dialog");
	page.on("dialog", async (dialog) => {
		if (dialogAction === "accept") {
			await dialog.accept();
			return;
		}
		await dialog.dismiss();
	});
	if (resetTutorial) {
		await resetTutorialProgress(browser);
	}
	await ensureAuthenticated(page);
	await ensureExtensionLoaded(page);
	if (startTutorial) {
		await page.bringToFront();
		await startTutorialFromWorker(browser, page.url());
	}
	return { browser, page };
}