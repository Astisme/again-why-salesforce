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
const WHAT_START_TUTORIAL = "start-tutorial";
const CXM_EMPTY_TABS = "empty-tabs";
const CXM_PIN_TAB = "pin-tab";
const CXM_MANAGE_TABS = "manage-tabs";
const USERNAME = Deno.env.get("SALESFORCE_USERNAME");
const PASSWORD = Deno.env.get("SALESFORCE_PASSWORD");
const CHROME_PROFILE_NAME = Deno.env.get("SALESFORCE_CHROME_PROFILE_NAME");
const CHROME_PROFILE_DIR = Deno.env.get("SALESFORCE_CHROME_PROFILE_DIR");
const IS_CI = (Deno.env.get("CI") ?? "").toLowerCase() === "true";
const GITHUB_CHANGELOG_URL =
	"https://github.com/Astisme/again-why-salesforce/blob/main/docs/CHANGELOG.md";
const SF_DEBUG_DIR = "./tests/salesforce/debug";
let ACTIVE_USER_DATA_DIR: string | null = null;

function expandEnvPath(value: string) {
	const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
	if (value.startsWith("$HOME/")) {
		return `${home}/${value.slice("$HOME/".length)}`;
	}
	if (value.startsWith("~/")) {
		return `${home}/${value.slice(2)}`;
	}
	return value;
}

function parseProfileNameInput(input?: string | null) {
	if (input == null || input.trim() === "") {
		return { profileName: undefined, profileDirFromName: undefined };
	}
	const normalized = expandEnvPath(input.trim()).replaceAll("\\", "/");
	const trimmed = normalized.replace(/\/+$/, "");
	if (!trimmed.includes("/")) {
		return { profileName: trimmed, profileDirFromName: undefined };
	}
	const parts = trimmed.split("/").filter((part) => part !== "");
	const profileName = parts.at(-1);
	const profileDirFromName = parts.length > 1
		? parts.slice(0, -1).join("/")
		: undefined;
	return { profileName, profileDirFromName };
}

const RESOLVED_PROFILE = parseProfileNameInput(CHROME_PROFILE_NAME);

export function getChromePath() {
	try {
		const bundledChromePath = puppeteer.executablePath();
		if (bundledChromePath && Deno.statSync(bundledChromePath).isFile) {
			return bundledChromePath;
		}
	} catch {
		// Fallback to system-installed Chrome paths below.
	}

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
			`${home}/.local/chrome/opt/google/chrome/chrome`,
			"/usr/bin/google-chrome",
			"/usr/bin/chromium-browser",
			"/usr/bin/chromium",
			`${home}/.local/bin/google-chrome`,
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

async function ensureChromeProfileUnlocked(profileDir: string) {
	try {
		const psOut = await new Deno.Command("ps", {
			args: ["-eo", "pid,args"],
			stdout: "piped",
			stderr: "null",
		}).output();
		const text = new TextDecoder().decode(psOut.stdout);
		for (const line of text.split("\n")) {
			const trimmed = line.trim();
			if (
				trimmed.length < 1 ||
				!trimmed.includes(profileDir) ||
				(!trimmed.includes("chrome-linux64/chrome") &&
					!trimmed.includes("google-chrome"))
			) {
				continue;
			}
			const [pidText] = trimmed.split(/\s+/, 1);
			const pid = Number.parseInt(pidText, 10);
			if (!Number.isNaN(pid) && pid !== Deno.pid) {
				try {
					Deno.kill(pid, "SIGTERM");
				} catch {
					// ignore
				}
			}
		}
	} catch {
		// best effort cleanup only
	}
	await sleep(300);
	const singletonLock = `${profileDir}/SingletonLock`;
	let lockTarget: string | null = null;
	try {
		lockTarget = await Deno.readLink(singletonLock);
	} catch {
		lockTarget = null;
	}
	if (lockTarget != null) {
		const pid = Number.parseInt(lockTarget.split("-").at(-1) ?? "", 10);
		if (!Number.isNaN(pid)) {
			try {
				Deno.kill(pid, 0);
				throw new Error(
					`Chrome profile is already in use by process ${pid}. Close any Chrome process using ${profileDir} and retry.`,
				);
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					// stale lock from dead process, safe to clean below
				} else if (
					error instanceof Error &&
					error.message.includes("already in use")
				) {
					throw error;
				}
			}
		}
	}
	for (
		const lockFile of [
			"SingletonLock",
			"SingletonCookie",
			"SingletonSocket",
			"DevToolsActivePort",
		]
	) {
		await Deno.remove(`${profileDir}/${lockFile}`, { recursive: true })
			.catch(
				() => null,
			);
	}
}

export async function getUserDataDir() {
	const profileDirInput = expandEnvPath(
		CHROME_PROFILE_DIR ?? RESOLVED_PROFILE.profileDirFromName ??
			DEFAULT_PROFILE_DIR,
	);
	await Deno.mkdir(profileDirInput, { recursive: true });
	const profileDir = Deno.realPathSync(profileDirInput);
	await ensureChromeProfileUnlocked(profileDir);
	ACTIVE_USER_DATA_DIR = profileDir;
	return profileDir;
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

async function getExtensionIdFromPreferences() {
	const profileDir = ACTIVE_USER_DATA_DIR ?? await getUserDataDir();
	const profileName = RESOLVED_PROFILE.profileName == null ||
			RESOLVED_PROFILE.profileName === ""
		? "Default"
		: RESOLVED_PROFILE.profileName;
	const preferencesPath = `${profileDir}/${profileName}/Preferences`;
	const preferences = JSON.parse(await Deno.readTextFile(preferencesPath));
	const settings = preferences?.extensions?.settings;
	if (settings == null || typeof settings !== "object") {
		throw new Error(
			`Chrome extension settings not found in ${preferencesPath}`,
		);
	}
	const extensionPath = getExtensionPath();
	for (const [id, value] of Object.entries(settings)) {
		if (
			value != null &&
			typeof value === "object" &&
			"path" in value &&
			(value as { path?: string }).path === extensionPath
		) {
			return id;
		}
	}
	throw new Error(
		`Unable to determine extension ID for path ${extensionPath} from ${preferencesPath}`,
	);
}

async function getLiveExtensionContext(browser, extensionId?: string) {
	const urlPrefix = extensionId == null
		? "chrome-extension://"
		: `chrome-extension://${extensionId}/`;
	const extensionPageMatcher = (target) =>
		target.type() === "page" && target.url().startsWith(urlPrefix);
	const matcher = (target) =>
		(
			target.type() === "service_worker" ||
			target.type() === "background_page"
		) &&
		target.url().startsWith(urlPrefix);
	const openExtensionPageContext = async () => {
		const existingPageTarget = browser.targets().find(extensionPageMatcher);
		if (existingPageTarget != null) {
			const existingPage = await existingPageTarget.page();
			if (existingPage != null) {
				try {
					await existingPage.evaluate(() => location.href);
					return existingPage;
				} catch {
					await existingPage.close().catch(() => null);
				}
			}
		}
		if (extensionId == null) {
			return null;
		}
		const page = await browser.newPage();
		const optionsUrl = `${urlPrefix}settings/options.html`;
		await page.goto(optionsUrl, {
			waitUntil: "domcontentloaded",
			timeout: 15000,
		}).catch(() => null);
		if (page.url().startsWith(urlPrefix)) {
			try {
				await page.evaluate(() => location.href);
			} catch {
				await page.close().catch(() => null);
				return null;
			}
			return page;
		}
		await page.close().catch(() => null);
		return null;
	};
	let target = browser.targets().find(matcher);
	if (target == null) {
		try {
			target = await browser.waitForTarget(matcher, { timeout: 15000 });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!message.includes("Timed out after waiting")) {
				throw error;
			}
			const pageContext = await openExtensionPageContext();
			if (pageContext != null) {
				return pageContext;
			}
			throw error;
		}
	}
	if (target.type() === "service_worker") {
		const worker = await target.worker();
		if (worker == null) {
			const pageContext = await openExtensionPageContext();
			if (pageContext != null) {
				return pageContext;
			}
			throw new Error("Extension service worker not available");
		}
		return worker;
	}
	const backgroundPage = await target.page();
	if (backgroundPage == null) {
		throw new Error("Extension background page not available");
	}
	return backgroundPage;
}

async function withExtensionContext<T>(
	browser,
	fn: (context) => Promise<T>,
) {
	const maxAttempts = 6;
	let lastError: unknown = null;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			let extensionId: string | undefined = undefined;
			try {
				extensionId = await getExtensionIdFromPreferences();
			} catch {
				// fall back to first available extension target if id is unavailable
			}
			const liveContext = await getLiveExtensionContext(browser, extensionId);
			return await fn(liveContext);
		} catch (error) {
			lastError = error;
			const message = error instanceof Error ? error.message : String(error);
			const canRetry = message.includes("Timed out after waiting") ||
				message.includes("service worker not available") ||
				message.includes("Execution context is not available") ||
				message.includes("detached Frame") ||
				message.includes("Target closed") ||
				message.includes("Protocol error");
			if (!canRetry || attempt === maxAttempts) {
				throw error;
			}
			const waitMs = 300 * attempt;
			console.warn(
				`withExtensionContext: retrying ${attempt}/${maxAttempts} after ${waitMs}ms (${message})`,
			);
			await sleep(waitMs);
		}
	}
	throw lastError;
}

function messageErrorText(error?: string | null) {
	return (error ?? "").toLowerCase();
}

function isTransientMessageError(error?: string | null) {
	const text = messageErrorText(error);
	return text.includes("receiving end does not exist") ||
		text.includes("timed out waiting for runtime.sendmessage callback") ||
		text.includes("timed out waiting for tabs.sendmessage callback") ||
		text.includes(
			"timed out waiting for chrome.storage.local.set callback",
		) ||
		text.includes(
			"timed out waiting for chrome.storage.local.get callback",
		) ||
		text.includes("extension context invalidated") ||
		text.includes("context was destroyed") ||
		text.includes("chromemethodbfe") ||
		text.includes("lockfile") ||
		text.includes("target closed") ||
		text.includes("attempted to use detached frame") ||
		text.includes(
			"execution context is not available in detached frame or worker",
		) ||
		text.includes("protocol error: connection closed") ||
		text.includes("cannot access a dead object");
}

async function retryMessageSend<
	T extends { ok: boolean; error?: string | null },
>(
	label: string,
	operation: () => Promise<T>,
) {
	const maxAttempts = 6;
	let lastResponse: T | null = null;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		let response: T;
		try {
			response = await operation();
		} catch (error) {
			const message = error instanceof Error
				? error.message
				: String(error);
			if (
				!isTransientMessageError(message) ||
				attempt === maxAttempts
			) {
				throw error;
			}
			const waitMs = 200 * attempt;
			console.warn(
				`${label}: transient thrown error on attempt ${attempt}/${maxAttempts} (${message}), retrying in ${waitMs}ms`,
			);
			await sleep(waitMs);
			continue;
		}
		lastResponse = response;
		if (response?.ok === true) {
			return response;
		}
		if (
			!isTransientMessageError(response?.error) || attempt === maxAttempts
		) {
			return response;
		}
		const waitMs = 200 * attempt;
		console.warn(
			`${label}: transient failure on attempt ${attempt}/${maxAttempts} (${
				response?.error ?? "unknown error"
			}), retrying in ${waitMs}ms`,
		);
		await sleep(waitMs);
	}
	return lastResponse as T;
}

async function sendRuntimeMessageFromWorker(browser, message) {
	console.log(`sendRuntimeMessageFromWorker: ${JSON.stringify(message)}`);
	const response = await retryMessageSend(
		"sendRuntimeMessageFromWorker",
		() =>
			withExtensionContext(
				browser,
				(extensionContext) =>
					extensionContext.evaluate(
						(request) =>
							new Promise((resolve) => {
								const runtime = globalThis.chrome?.runtime;
								if (runtime?.sendMessage == null) {
									resolve({
										ok: false,
										error:
											"runtime.sendMessage unavailable in extension context",
									});
									return;
								}
								const timeoutId = setTimeout(() => {
									resolve({
										ok: false,
										error:
											"Timed out waiting for runtime.sendMessage callback",
									});
								}, 15000);
								runtime.sendMessage(request, () => {
									clearTimeout(timeoutId);
									const error = runtime.lastError?.message ??
										null;
									resolve({ ok: error == null, error });
								});
							}),
						message,
					),
			),
	);
	return response as { ok: boolean; error?: string | null };
}

async function sendMessageToSalesforceTab(
	browser,
	salesforceUrl: string,
	message,
) {
	console.log(
		`sendMessageToSalesforceTab: ${
			JSON.stringify({ salesforceUrl, message })
		}`,
	);
	const response = await retryMessageSend(
		"sendMessageToSalesforceTab",
		() =>
			withExtensionContext(
				browser,
				(extensionContext) =>
					extensionContext.evaluate(
						({ expectedUrl, instance, request }) =>
							new Promise((resolve) => {
								const tabs = globalThis.chrome?.tabs;
								if (
									tabs?.query == null ||
									tabs.sendMessage == null
								) {
									resolve({
										ok: false,
										error:
											"tabs API unavailable in extension context",
									});
									return;
								}
								tabs.query({}, (allTabs) => {
									const exactTarget = allTabs.find((tab) =>
										tab.url === expectedUrl
									);
									const activeTarget = allTabs.find((tab) =>
										tab.active === true &&
										tab.url?.includes(
											`${instance}.my.salesforce-setup.com`,
										)
									);
									const fallbackTarget = allTabs.find((tab) =>
										tab.url?.includes(
											`${instance}.my.salesforce-setup.com`,
										)
									);
									const target = exactTarget ??
										activeTarget ??
										fallbackTarget;
									if (target?.id == null) {
										resolve({
											ok: false,
											error:
												`No Salesforce tab found for ${expectedUrl}`,
										});
										return;
									}
									tabs.sendMessage(target.id, request, () => {
										clearTimeout(timeoutId);
										const error = globalThis.chrome?.runtime
											?.lastError?.message ??
											null;
										resolve({ ok: error == null, error });
									});
								});
								const timeoutId = setTimeout(() => {
									resolve({
										ok: false,
										error:
											"Timed out waiting for tabs.sendMessage callback",
									});
								}, 15000);
							}),
						{
							expectedUrl: salesforceUrl,
							instance: MY_INSTANCE,
							request: message,
						},
					),
			),
	);
	return response as { ok: boolean; error?: string | null };
}

async function setStorageValue(browser, key: string, value: unknown) {
	const result = await retryMessageSend(
		"setStorageValue",
		() =>
			withExtensionContext(
				browser,
				(extensionContext) =>
					extensionContext.evaluate(
						({ storageKey, storageValue }) =>
							new Promise((resolve) => {
								const storage = globalThis.chrome?.storage
									?.local;
								if (storage?.set == null) {
									resolve({
										ok: false,
										error:
											"chrome.storage.local.set unavailable",
									});
									return;
								}
								const timeoutId = setTimeout(() => {
									resolve({
										ok: false,
										error:
											"Timed out waiting for chrome.storage.local.set callback",
									});
								}, 15000);
								storage.set(
									{ [storageKey]: storageValue },
									() => {
										clearTimeout(timeoutId);
										const error = globalThis.chrome?.runtime
											?.lastError
											?.message ?? null;
										resolve({ ok: error == null, error });
									},
								);
							}),
						{ storageKey: key, storageValue: value },
					),
			),
	);
	return result as { ok: boolean; error?: string | null };
}

async function getStorageValue(browser, key: string) {
	const result = await retryMessageSend(
		"getStorageValue",
		() =>
			withExtensionContext(
				browser,
				(extensionContext) =>
					extensionContext.evaluate(
						(storageKey) =>
							new Promise((resolve) => {
								const storage = globalThis.chrome?.storage
									?.local;
								if (storage?.get == null) {
									resolve({
										ok: false,
										error:
											"chrome.storage.local.get unavailable",
										value: null,
									});
									return;
								}
								const timeoutId = setTimeout(() => {
									resolve({
										ok: false,
										error:
											"Timed out waiting for chrome.storage.local.get callback",
										value: null,
									});
								}, 15000);
								storage.get(storageKey, (items) => {
									clearTimeout(timeoutId);
									const error =
										globalThis.chrome?.runtime?.lastError
											?.message ?? null;
									resolve({
										ok: error == null,
										error,
										value: items?.[storageKey] ?? null,
									});
								});
							}),
						key,
					),
			),
	);
	return result as { ok: boolean; error?: string | null; value?: unknown };
}

export async function resetTutorialProgress(browser) {
	const response = await setStorageValue(browser, TUTORIAL_STORAGE_KEY, null);
	if (response?.ok !== true) {
		throw new Error(
			`Failed to reset tutorial progress: ${
				response?.error ?? "unknown error"
			}`,
		);
	}
}

export async function getTutorialProgress(browser) {
	const result = await getStorageValue(browser, TUTORIAL_STORAGE_KEY) as {
		ok: boolean;
		error?: string | null;
		value?: number | null;
	};
	if (result.ok !== true) {
		throw new Error(
			`Failed to read tutorial progress: ${
				result.error ?? "unknown error"
			}`,
		);
	}
	return result.value ?? null;
}

export async function setTutorialProgress(browser, progress: number) {
	const response = await setStorageValue(browser, TUTORIAL_STORAGE_KEY, progress);
	if (response?.ok !== true) {
		throw new Error(
			`Failed to set tutorial progress: ${
				response?.error ?? "unknown error"
			}`,
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
			`Failed to reset tabs before tutorial: ${
				emptyTabsResponse?.error ?? "unknown error"
			}`,
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
			`Failed to start tutorial: ${
				startResponse?.error ?? "unknown error"
			}`,
		);
	}
}

export async function openManageTabsFromWorker(browser, salesforceUrl: string) {
	const response = await sendMessageToSalesforceTab(browser, salesforceUrl, {
		what: CXM_MANAGE_TABS,
	});
	if (response?.ok !== true) {
		throw new Error(
			`Failed to open manage tabs modal: ${
				response?.error ?? "unknown error"
			}`,
		);
	}
}

export async function pinTabFromWorker(
	browser,
	salesforceUrl: string,
	message: { tabUrl: string; label: string; url: string; org: string },
) {
	const response = await sendMessageToSalesforceTab(browser, salesforceUrl, {
		what: CXM_PIN_TAB,
		...message,
	});
	if (response?.ok !== true) {
		throw new Error(
			`Failed to pin tab from worker: ${
				response?.error ?? "unknown error"
			}`,
		);
	}
}

export async function getSalesforcePage(browser) {
	await closeInstallTabs(browser);
	const pages = await browser.pages();
	const candidates = [
		...pages.filter((page) => isSalesforceUrl(page.url()) && !page.isClosed()),
		...pages.filter((page) => !isSalesforceUrl(page.url()) && !page.isClosed()),
	];
	for (const page of candidates) {
		try {
			await page.evaluate(() => location.href);
			return page;
		} catch (error) {
			if (!isTransientNavigationContextError(error)) {
				throw error;
			}
		}
	}
	const freshPage = await browser.newPage();
	await openSetupHome(freshPage).catch(() => null);
	return freshPage;
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
			return element instanceof HTMLInputElement &&
				element.value === expected;
		},
		{ timeout: 10000 },
		selector,
		value,
	);
	console.log(`${label} entered via native setter`);
	await sleep(400);
}

export async function dumpState(page, label) {
	await Deno.mkdir(SF_DEBUG_DIR, { recursive: true }).catch(() => null);
	const screenshotPath = `${SF_DEBUG_DIR}/${Date.now()}-${
		String(label).replaceAll(/[^a-zA-Z0-9-_]/g, "_")
	}.png`;
	await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() =>
		null
	);
	const state = await page.evaluate(
		(buttonSelector, rootSelector) => ({
			url: location.href,
			title: document.title,
			hasUsername: document.querySelector("#username") instanceof
				HTMLInputElement,
			hasPassword: document.querySelector("#password") instanceof
				HTMLInputElement,
			hasVerificationInput: Boolean(
				document.querySelector(
					'input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="code"]',
				),
			),
			hasExtensionRoot: Boolean(document.querySelector(rootSelector)),
			hasExtensionButton: Boolean(document.querySelector(buttonSelector)),
			body:
				document.body?.innerText?.replace(/\s+/g, " ").slice(0, 500) ??
					"",
		}),
		EXTENSION_BUTTON_ID,
		EXTENSION_ROOT_ID,
	);
	(state as Record<string, unknown>).screenshotPath = screenshotPath;
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
	const deadline = Date.now() + MANUAL_AUTH_TIMEOUT_MS;
	while (Date.now() < deadline) {
		try {
			await page.waitForFunction(
				() => {
					const hasLoginInputs = Boolean(
						document.querySelector("#username") ||
							document.querySelector("#password"),
					);
					const host = location.hostname.toLowerCase();
					const path = location.pathname.toLowerCase();
					const onAuthSurface =
						host.includes("login.salesforce.com") ||
						host.includes("test.salesforce.com") ||
						path.includes("/secur/") ||
						path.includes("/login");
					if (!hasLoginInputs && !onAuthSurface) {
						return true;
					}
					const hasOtpInputs = document.querySelector(
						'input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="code"]',
					);
					return !hasLoginInputs && !hasOtpInputs;
				},
				{ timeout: 5000 },
			);
			return;
		} catch (error) {
			const message = error instanceof Error
				? error.message
				: String(error);
			const shouldContinue = message.includes("Waiting failed") ||
				message.includes("Runtime.callFunctionOn timed out") ||
				isTransientNavigationContextError(error);
			if (!shouldContinue) {
				throw error;
			}
		}
		await sleep(1000);
	}
	throw new Error(
		`Timed out after ${MANUAL_AUTH_TIMEOUT_MS}ms waiting for manual Salesforce verification`,
	);
}

function isTransientNavigationContextError(error: unknown) {
	const text = error instanceof Error ? error.message : String(error);
	return text.includes("Execution context was destroyed") ||
		text.includes("Cannot find context with specified id") ||
		text.includes("Attempted to use detached Frame") ||
		text.includes("detached Frame");
}

async function hasAuthOrVerificationInputs(page) {
	for (let attempt = 1; attempt <= 6; attempt++) {
		try {
			return await page.evaluate(() => {
				const hasLoginInputs = Boolean(
					document.querySelector("#username") ||
						document.querySelector("#password"),
				);
				const host = location.hostname.toLowerCase();
				const path = location.pathname.toLowerCase();
				const onAuthSurface = host.includes("login.salesforce.com") ||
					host.includes("test.salesforce.com") ||
					path.includes("/secur/") ||
					path.includes("/login");
				if (!hasLoginInputs && !onAuthSurface) {
					return false;
				}
				return Boolean(
					hasLoginInputs ||
						document.querySelector(
							'input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="code"]',
						),
				);
			});
		} catch (error) {
			if (!isTransientNavigationContextError(error) || attempt === 6) {
				throw error;
			}
			await sleep(250 * attempt);
		}
	}
	return true;
}

export async function ensureAuthenticated(page) {
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
	if (USERNAME != null && PASSWORD != null) {
		console.log(
			"Persistent profile is not authenticated, attempting Salesforce login with configured credentials",
		);
		await setFieldValue(page, "#username", USERNAME, "Username");
		await setFieldValue(page, "#password", PASSWORD, "Password");
		await page.$eval(
			"#Login, input[type='submit'], button[type='submit']",
			(element) => {
				if (!(element instanceof HTMLElement)) {
					throw new Error("Login submit button not found");
				}
				element.click();
			},
		);
		await page.waitForNavigation({
			waitUntil: "domcontentloaded",
			timeout: 60000,
		}).catch(() => null);
		await sleep(1500);
		const needsVerification = await hasAuthOrVerificationInputs(page);
		if (needsVerification) {
			await waitForManualAuthCompletion(page);
		}
		try {
			await openSetupHome(page);
		} catch {
			// If Salesforce redirects through intermediate pages, continue checks below.
		}
		const loginStillVisible = await page.$("#username") != null &&
			await page.$("#password") != null;
		const urlAfterLogin = page.url();
		const onSalesforceDomain = urlAfterLogin.includes(".salesforce.com") ||
			urlAfterLogin.includes(".force.com");
		if (!loginStillVisible && onSalesforceDomain) {
			console.log(
				`Salesforce login completed successfully at ${urlAfterLogin}`,
			);
			return;
		}
	}
	if (!IS_CI) {
		console.error(
			"Salesforce login page is still visible. Complete login manually in the opened Chrome window to continue the test run.",
		);
		await waitForManualAuthCompletion(page);
		await openSetupHome(page).catch(() => null);
		const loginStillVisible = await page.$("#username") != null &&
			await page.$("#password") != null;
		if (!loginStillVisible) {
			console.log("Salesforce login completed manually");
			return;
		}
	}
	await dumpState(page, "profile-not-authenticated").catch(() => null);
	throw new Error(
		"Selected Chrome profile is not authenticated in Salesforce. Configure SALESFORCE_CHROME_PROFILE_DIR (and optionally SALESFORCE_CHROME_PROFILE_NAME) to your pre-authenticated profile.",
	);
}

export async function openSetupHome(page) {
	try {
		await page.goto(SF_SETUP_HOME_URL, {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
	} catch (error) {
		if (
			!(error instanceof Error) || !error.message.includes("ERR_ABORTED")
		) {
			throw error;
		}
		await page.waitForFunction(
			(expectedHost) => location.hostname.includes(expectedHost),
			{ timeout: 60000 },
			".my.salesforce-setup.com",
		);
	}
}

export async function openFavouriteTestPage(page) {
	await page.goto(SF_FAVOURITE_TEST_URL, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
}

export async function ensureExtensionLoaded(browser, page) {
	let currentPage = page;
	let lastError: Error | null = null;
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			currentPage = await getSalesforcePage(browser);
			await openSetupHome(currentPage);
			await sleep(3000);
			const needsLogin = await currentPage.$("#username") != null &&
				await currentPage.$("#password") != null;
			if (needsLogin) {
				await ensureAuthenticated(currentPage);
				currentPage = await getSalesforcePage(browser);
				await openSetupHome(currentPage);
				await sleep(3000);
			}
			await currentPage.waitForSelector(EXTENSION_ROOT_ID, {
				timeout: 30000,
			});
			return currentPage;
		} catch (error) {
			lastError = error instanceof Error
				? error
				: new Error(String(error));
			const shouldRecover =
				isTransientNavigationContextError(lastError) ||
				lastError.message.includes("frame got detached") ||
				lastError.message.includes("Target closed");
			if (shouldRecover) {
				await sleep(250 * (attempt + 1));
				currentPage = await getSalesforcePage(browser);
				continue;
			}
		}
	}
	await dumpState(currentPage, "extension-root-missing").catch(() => null);
	throw new Error(
		`Extension root ${EXTENSION_ROOT_ID} not found on Salesforce Setup home. Verify the unpacked extension at ${getExtensionPath()}. Last error: ${
			lastError?.message ?? "unknown"
		}`,
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
	const extensionPath = getExtensionPath();
	const launchArgs = [
		"--window-size=1440,1000",
		"--no-first-run",
		`--disable-extensions-except=${extensionPath}`,
		`--load-extension=${extensionPath}`,
		"--enable-extensions",
	];
	if (
		RESOLVED_PROFILE.profileName != null &&
		RESOLVED_PROFILE.profileName !== ""
	) {
		launchArgs.push(`--profile-directory=${RESOLVED_PROFILE.profileName}`);
	}
	if (Deno.build.os === "linux") {
		launchArgs.push(
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-crash-reporter",
		);
	}
	const userDataDir = await getUserDataDir();
	const browser = await puppeteer.launch({
		browser: "chrome",
		executablePath: getChromePath(),
		headless: false,
		pipe: true,
		ignoreDefaultArgs: [
			"--disable-extensions",
			"--disable-component-extensions-with-background-pages",
		],
		userDataDir,
		defaultViewport: null,
		args: launchArgs,
		timeout: 30000,
		protocolTimeout: 180000,
	});
	await closeInstallTabs(browser);
	const page = await browser.newPage();
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
	let lastError: unknown = null;
	for (let attempt = 1; attempt <= 3; attempt++) {
		console.log("createReadySalesforceSession: launching browser");
		const { browser, page } = await launchSalesforceBrowser();
		try {
			let activePage = page;
			page.removeAllListeners("dialog");
			page.on("dialog", async (dialog) => {
				if (dialogAction === "accept") {
					await dialog.accept();
					return;
				}
				await dialog.dismiss();
			});
			console.log("createReadySalesforceSession: ensuring auth");
			await ensureAuthenticated(activePage);
			activePage = await getSalesforcePage(browser);
			console.log("createReadySalesforceSession: ensuring extension loaded");
			activePage = await ensureExtensionLoaded(browser, activePage);
			if (resetTutorial) {
				console.log(
					"createReadySalesforceSession: resetting tutorial after extension is ready",
				);
				await resetTutorialProgress(browser);
			}
			if (startTutorial) {
				console.log("createReadySalesforceSession: starting tutorial");
				await activePage.bringToFront();
				await startTutorialFromWorker(browser, activePage.url());
			}
			console.log("createReadySalesforceSession: ready");
			return { browser, page: activePage };
		} catch (error) {
			lastError = error;
			await browser.close().catch(() => null);
			const message = error instanceof Error ? error.message : String(error);
			const isRetryable = isTransientNavigationContextError(error) ||
				message.includes("Protocol error: Connection closed") ||
				message.includes("Target closed") ||
				message.includes("Execution context");
			if (!isRetryable || attempt === 3) {
				throw error;
			}
			const waitMs = 500 * attempt;
			console.warn(
				`createReadySalesforceSession: retrying bootstrap ${attempt}/3 in ${waitMs}ms (${message})`,
			);
			await sleep(waitMs);
		}
	}
	throw lastError;
}
