import { assertEquals } from "@std/testing/asserts";
import {
	createMockWindow,
	MockDocument,
	MockElement,
} from "./mock-dom.test.ts";
import { loadIsolatedModule } from "../load-isolated-module.test.ts";

type Setting = {
	enabled: boolean;
	id: string;
};

type BrowserTab = {
	id: number;
	index: number;
};

type NotSalesforceSetupDependencies = {
	BROWSER: {
		tabs: {
			create: (details: {
				index: number;
				openerTabId: number;
				url: string;
			}) => void;
			update: (details: { url: string }) => void;
		};
	};
	HIDDEN_CLASS: string;
	POPUP_LOGIN_NEW_TAB: string;
	POPUP_OPEN_LOGIN: string;
	POPUP_OPEN_SETUP: string;
	POPUP_SETUP_NEW_TAB: string;
	SALESFORCE_LIGHTNING_PATTERN: RegExp;
	SALESFORCE_SETUP_HOME_MINI: string;
	SETUP_LIGHTNING: string;
	WHAT_GET_BROWSER_TAB: string;
	console: {
		warn: (error: unknown) => void;
	};
	ensureTranslatorAvailability: () => Promise<void>;
	getSettings: (keys: string[]) => Promise<Setting[]>;
	sendExtensionMessage: (
		message: { what: string },
	) => Promise<BrowserTab | null>;
};

/**
 * Creates and appends a mock DOM element with an id.
 *
 * @param {MockDocument} document Mock document.
 * @param {string} tagName Element tag name.
 * @param {string} id Element id.
 * @return {MockElement} Created element.
 */
function appendElement(
	document: MockDocument,
	tagName: string,
	id: string,
): MockElement {
	const element = document.createElement(tagName);
	element.id = id;
	document.body.appendChild(element);
	return element;
}

/**
 * Loads the non-Salesforce popup with isolated dependencies.
 *
 * @param {Object} options Fixture options.
 * @param {BrowserTab[]} [options.browserTabResponses=[]] Tabs returned by the background lookup.
 * @param {string | null} [options.pageUrl=null] Page URL passed in the popup query string.
 * @param {Setting[]} [options.settings=[]] Popup settings returned by `getSettings`.
 * @return {Promise<{ cleanup: () => void; counters: { closeCalls: number; translatorCalls: number; }; creates: { index: number; openerTabId: number; url: string; }[]; invalidUrl: MockElement; login: MockElement; plain: MockElement; sendMessages: { what: string; }[]; setup: MockElement; updates: { url: string; }[]; warnings: unknown[]; }>} Loaded popup fixtures.
 */
async function loadNotSalesforceSetupModule({
	browserTabResponses = [],
	pageUrl = null,
	settings = [],
}: {
	browserTabResponses?: Array<BrowserTab | null>;
	pageUrl?: string | null;
	settings?: Setting[];
}) {
	const popupUrl = new URL(
		"https://example.test/action/notSalesforceSetup.html",
	);
	if (pageUrl != null) {
		popupUrl.searchParams.set("url", pageUrl);
	}
	const window = createMockWindow(popupUrl.href);
	const document = window.document;
	const plain = appendElement(document, "div", "plain");
	const invalidUrl = appendElement(document, "div", "invalid-url");
	const login = appendElement(document, "a", "login");
	const setup = appendElement(document, "a", "go-setup");
	login.href = "https://login.salesforce.com/";
	setup.href = "#";
	const counters = {
		closeCalls: 0,
		translatorCalls: 0,
	};
	const creates: { index: number; openerTabId: number; url: string }[] = [];
	const updates: { url: string }[] = [];
	const warnings: unknown[] = [];
	const sendMessages: { what: string }[] = [];
	const remainingResponses = [...browserTabResponses];

	const { cleanup } = await loadIsolatedModule<
		Record<string, never>,
		NotSalesforceSetupDependencies
	>({
		modulePath: new URL(
			"../../src/action/notSalesforceSetup/notSalesforceSetup.js",
			import.meta.url,
		),
		dependencies: {
			BROWSER: {
				tabs: {
					create: (details) => {
						creates.push(details);
					},
					update: (details) => {
						updates.push(details);
					},
				},
			},
			HIDDEN_CLASS: "hidden",
			POPUP_LOGIN_NEW_TAB: "popup_login_new_tab",
			POPUP_OPEN_LOGIN: "popup_open_login",
			POPUP_OPEN_SETUP: "popup_open_setup",
			POPUP_SETUP_NEW_TAB: "popup_setup_new_tab",
			SALESFORCE_LIGHTNING_PATTERN:
				/^https:\/\/[a-z0-9.-]+\.lightning\.force\.com.*$/i,
			SALESFORCE_SETUP_HOME_MINI: "SetupOneHome/home",
			SETUP_LIGHTNING: "/lightning/setup/",
			WHAT_GET_BROWSER_TAB: "get-browser-tab",
			console: {
				warn: (error) => {
					warnings.push(error);
				},
			},
			ensureTranslatorAvailability: () => {
				counters.translatorCalls++;
				return Promise.resolve();
			},
			getSettings: () => Promise.resolve(settings),
			sendExtensionMessage: (message) => {
				sendMessages.push(message);
				return Promise.resolve(remainingResponses.shift() ?? null);
			},
		},
		globals: {
			close: () => {
				counters.closeCalls++;
			},
			document,
			location: window.location,
			setTimeout: (callback: () => void) => {
				callback();
				return counters.closeCalls;
			},
		},
		importsToReplace: new Set([
			"/constants.js",
			"/functions.js",
			"/translator.js",
			"../themeHandler.js",
		]),
	});

	return {
		cleanup,
		counters,
		creates,
		invalidUrl,
		login,
		plain,
		sendMessages,
		setup,
		updates,
		warnings,
	};
}

Deno.test("notSalesforceSetup auto-opens Salesforce setup in a new tab", async () => {
	const fixture = await loadNotSalesforceSetupModule({
		browserTabResponses: [{ id: 7, index: 2 }],
		pageUrl: "https://acme.lightning.force.com/lightning/page/home",
		settings: [
			{ enabled: true, id: "popup_open_setup" },
			{ enabled: false, id: "popup_setup_new_tab" },
		],
	});

	try {
		assertEquals(fixture.login.classList.contains("hidden"), true);
		assertEquals(fixture.setup.classList.contains("hidden"), false);
		assertEquals(
			fixture.setup.href,
			"https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
		);
		assertEquals(fixture.creates, [{
			index: 3,
			openerTabId: 7,
			url: "https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
		}]);
		assertEquals(fixture.sendMessages, [{
			what: "get-browser-tab",
		}]);
		assertEquals(fixture.counters.closeCalls, 1);
		assertEquals(fixture.counters.translatorCalls, 0);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("notSalesforceSetup updates the current tab when configured to reuse it", async () => {
	const fixture = await loadNotSalesforceSetupModule({
		pageUrl: "https://example.com/not-salesforce",
		settings: [
			{ enabled: false, id: "popup_open_login" },
			{ enabled: true, id: "popup_login_new_tab" },
		],
	});

	try {
		assertEquals(fixture.counters.translatorCalls, 1);
		fixture.login.click();
		assertEquals(fixture.updates, [{
			url: "https://login.salesforce.com/",
		}]);
		assertEquals(fixture.creates, []);
		assertEquals(fixture.sendMessages, []);
		assertEquals(fixture.counters.closeCalls, 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("notSalesforceSetup shows the invalid URL state when the query URL cannot be parsed", async () => {
	const fixture = await loadNotSalesforceSetupModule({
		pageUrl: "not-a-valid-url",
		settings: [],
	});

	try {
		assertEquals(fixture.plain.classList.contains("hidden"), true);
		assertEquals(fixture.invalidUrl.classList.contains("hidden"), false);
		assertEquals(fixture.warnings.length, 1);
		assertEquals(fixture.counters.translatorCalls, 1);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("notSalesforceSetup retries browser tab lookup until a tab is available", async () => {
	const fixture = await loadNotSalesforceSetupModule({
		browserTabResponses: [null, null, { id: 9, index: 1 }],
		settings: [
			{ enabled: true, id: "popup_open_login" },
			{ enabled: false, id: "popup_login_new_tab" },
		],
	});

	try {
		assertEquals(fixture.sendMessages, [
			{ what: "get-browser-tab" },
			{ what: "get-browser-tab" },
			{ what: "get-browser-tab" },
		]);
		assertEquals(fixture.creates, [{
			index: 2,
			openerTabId: 9,
			url: "https://login.salesforce.com/",
		}]);
		assertEquals(fixture.counters.closeCalls, 1);
		assertEquals(fixture.counters.translatorCalls, 0);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("notSalesforceSetup throws when the browser tab lookup never returns a tab", async () => {
	const errorPromise = new Promise<Error>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			globalThis.removeEventListener(
				"unhandledrejection",
				onUnhandledRejection,
			);
			reject(new Error("expected_unhandled_rejection"));
		}, 1000);
		function onUnhandledRejection(event: PromiseRejectionEvent) {
			if (
				event.reason instanceof Error &&
				event.reason.message === "error_no_browser_tab"
			) {
				event.preventDefault();
				clearTimeout(timeoutId);
				globalThis.removeEventListener(
					"unhandledrejection",
					onUnhandledRejection,
				);
				resolve(event.reason);
			}
		}
		globalThis.addEventListener("unhandledrejection", onUnhandledRejection);
	});

	const fixture = await loadNotSalesforceSetupModule({
		browserTabResponses: [null, null, null, null, null, null],
		settings: [
			{ enabled: true, id: "popup_open_login" },
			{ enabled: false, id: "popup_login_new_tab" },
		],
	});

	try {
		const thrownError = await errorPromise;
		assertEquals(thrownError.message, "error_no_browser_tab");
		assertEquals(fixture.sendMessages.length, 7);
		for (const message of fixture.sendMessages) {
			assertEquals(message, { what: "get-browser-tab" });
		}
		assertEquals(fixture.counters.closeCalls, 1);
	} finally {
		fixture.cleanup();
	}
});
