import { assertEquals } from "@std/testing/asserts";
import {
	createMockWindow,
	MockDocument,
	MockElement,
} from "./mock-dom.test.ts";

const CMD_EXPORT_ALL = "cmd-export-all";
const CMD_IMPORT = "cmd-import";
const CMD_OPEN_SETTINGS = "cmd-open-settings";
const CXM_MANAGE_TABS = "manage-tabs";
const WHAT_EXPORT_CHECK = "export-check";
const WHAT_GET_COMMANDS = "get-commands";
const WHAT_SHOW_IMPORT = "show-import";
const WHAT_START_TUTORIAL = "start-tutorial";

type Command = {
	name: string;
	shortcut: string;
};

/**
 * Imports the popup runtime after ensuring browser globals exist.
 *
 * @return {Promise<typeof import("../../../src/action/popup/popup-runtime.js")>} Popup runtime module.
 */
async function loadPopupRuntime() {
	const globalValues = globalThis as unknown as Record<string, unknown>;
	if (globalValues.chrome == null || globalValues.browser == null) {
		const browserGlobal = {
			i18n: {
				getMessage: (_key: string) => "again-why-salesforce",
			},
			runtime: {
				getURL: (path: string) => path,
				getManifest: () => ({
					homepage_url: "https://github.com/acme/again-why-salesforce",
					optional_host_permissions: [],
					version: "1.0.0",
				}),
			},
		};
		globalValues.chrome = browserGlobal;
		globalValues.browser = browserGlobal;
	}
	return await import("../../../src/action/popup/popup-runtime.js");
}

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
 * Loads the popup entrypoint with isolated dependencies.
 *
 * @param {Object} options Fixture options.
 * @param {Command[]} [options.availableCommands=[]] Commands returned by the background script.
 * @param {Command[] | null | undefined} [options.commandResponse=availableCommands] Message response for the command list request.
 * @param {boolean} [options.framePatternsAllowed=true] Whether frame patterns are allowed.
 * @param {string | null} [options.exportDataset="popup_export+-+extra"] Export button translation dataset.
 * @param {string | null} [options.importDataset="popup_import+-+extra"] Import button translation dataset.
 * @param {{ison: boolean; url?: string | null}} [options.salesforceState={ ison: true }] Salesforce setup detection result.
 * @param {string | null} [options.settingsDataset="popup_settings+-+extra"] Settings button translation dataset.
 * @return {Promise<{ counters: { closeCalls: number; openSettingsCalls: number; }; exportButton: MockElement; importButton: MockElement; locationRef: URL; manageTabsButton: MockElement; messages: Record<string, unknown>[]; settingsButton: MockElement; tutorialButton: MockElement; }>} Loaded popup fixture.
 */
async function loadPopupModule({
	availableCommands = [],
	commandResponse = availableCommands,
	framePatternsAllowed = true,
	exportDataset = "popup_export+-+extra",
	importDataset = "popup_import+-+extra",
	salesforceState = { ison: true },
	settingsDataset = "popup_settings+-+extra",
}: {
	availableCommands?: Command[];
	commandResponse?: Command[] | null;
	framePatternsAllowed?: boolean;
	exportDataset?: string | null;
	importDataset?: string | null;
	salesforceState?: { ison: boolean; url?: string | null };
	settingsDataset?: string | null;
}) {
	const window = createMockWindow(
		"https://example.test/action/popup/popup.html",
	);
	const document = window.document;
	const importButton = appendElement(document, "button", "import");
	const exportButton = appendElement(document, "button", "export");
	const settingsButton = appendElement(document, "button", "open-settings");
	const manageTabsButton = appendElement(document, "button", "manage-tabs");
	const tutorialButton = appendElement(document, "button", "tutorial");
	if (importDataset != null) {
		importButton.dataset.i18n = importDataset;
	}
	if (exportDataset != null) {
		exportButton.dataset.i18n = exportDataset;
	}
	if (settingsDataset != null) {
		settingsButton.dataset.i18n = settingsDataset;
	}
	const counters = {
		closeCalls: 0,
		openSettingsCalls: 0,
	};
	const messages: Record<string, unknown>[] = [];
	const { runPopup } = await loadPopupRuntime();

	await runPopup({
		areFramePatternsAllowedFn: () =>
			Promise.resolve(framePatternsAllowed),
		browser: {
			runtime: {
				getURL: (path: string) => `chrome-extension://test/${path}`,
			},
		},
		closePopupFn: () => {
			counters.closeCalls++;
		},
		documentRef: document,
		getTranslationsFn: (message) => Promise.resolve(message),
		isOnSalesforceSetupFn: () => Promise.resolve(salesforceState),
		locationRef: window.location,
		openSettingsPageFn: () => {
			counters.openSettingsCalls++;
		},
		sendExtensionMessageFn: (
			message: Record<string, unknown>,
		) => {
			messages.push(message);
			if (message.what === WHAT_GET_COMMANDS) {
				return Promise.resolve(commandResponse);
			}
			return Promise.resolve(undefined);
		},
		translationDataset: "i18n",
		translationSeparator: "+-+",
	});

	return {
		counters,
		exportButton,
		importButton,
		locationRef: window.location as URL,
		manageTabsButton,
		messages,
		settingsButton,
		tutorialButton,
	};
}

Deno.test("popup redirects to the host-permissions page when Salesforce setup access lacks frame permissions", async () => {
	const fixture = await loadPopupModule({
		framePatternsAllowed: false,
		salesforceState: { ison: true },
	});

	assertEquals(
		fixture.locationRef.href,
		"chrome-extension://test/action/req_permissions/req_permissions.html?whichid=hostpermissions",
	);
});

Deno.test("popup redirects to the non-Salesforce page when the current tab is not Salesforce setup", async () => {
	const fixture = await loadPopupModule({
		salesforceState: {
			ison: false,
			url: "https://example.com/page",
		},
	});

	assertEquals(
		fixture.locationRef.href,
		"chrome-extension://test/action/notSalesforceSetup/notSalesforceSetup.html?url=https://example.com/page",
	);
});

Deno.test("popup omits the url query string when Salesforce setup detection returns no page url", async () => {
	const fixture = await loadPopupModule({
		salesforceState: {
			ison: false,
			url: null,
		},
	});

	assertEquals(
		fixture.locationRef.href,
		"chrome-extension://test/action/notSalesforceSetup/notSalesforceSetup.html",
	);
});

Deno.test("popup wires command titles and action buttons in the normal setup flow", async () => {
	const fixture = await loadPopupModule({
		availableCommands: [
			{ name: CMD_IMPORT, shortcut: "Ctrl+I" },
			{ name: CMD_EXPORT_ALL, shortcut: "Ctrl+E" },
			{ name: CMD_OPEN_SETTINGS, shortcut: "Ctrl+S" },
			{ name: "cmd-unknown", shortcut: "Ctrl+U" },
		],
		salesforceState: { ison: true },
	});

	assertEquals(
		String(fixture.importButton.title),
		"popup_import,(Ctrl+I)",
	);
	assertEquals(
		String(fixture.exportButton.title),
		"popup_export,(Ctrl+E)",
	);
	assertEquals(
		String(fixture.settingsButton.title),
		"popup_settings,(Ctrl+S)",
	);

	await fixture.importButton.click();
	await fixture.exportButton.click();
	await fixture.settingsButton.click();
	await fixture.manageTabsButton.click();
	await fixture.tutorialButton.click();

	assertEquals(fixture.messages, [
		{
			what: WHAT_GET_COMMANDS,
			commands: [CMD_EXPORT_ALL, CMD_IMPORT, CMD_OPEN_SETTINGS],
		},
		{ what: WHAT_SHOW_IMPORT },
		{ what: WHAT_EXPORT_CHECK },
		{ what: CXM_MANAGE_TABS },
		{ what: WHAT_START_TUTORIAL },
	]);
	assertEquals(fixture.counters.closeCalls, 4);
	assertEquals(fixture.counters.openSettingsCalls, 1);
});

Deno.test("popup keeps shortcut wiring stable when translation datasets are incomplete", async () => {
	const fixture = await loadPopupModule({
		availableCommands: [
			{ name: CMD_IMPORT, shortcut: "Ctrl+I" },
			{ name: CMD_OPEN_SETTINGS, shortcut: "Ctrl+S" },
		],
		importDataset: null,
		settingsDataset: "popup_settings",
	});

	assertEquals(
		String(fixture.importButton.title),
		",(Ctrl+I)",
	);
	assertEquals(
		String(fixture.settingsButton.title),
		"popup_settings,(Ctrl+S)",
	);
});

Deno.test("popup skips command-title updates when command metadata is missing", async () => {
	const fixture = await loadPopupModule({
		commandResponse: null,
	});

	assertEquals(String(fixture.importButton.title), "");
	await fixture.importButton.click();
	assertEquals(fixture.messages, [
		{
			what: WHAT_GET_COMMANDS,
			commands: [CMD_EXPORT_ALL, CMD_IMPORT, CMD_OPEN_SETTINGS],
		},
		{ what: WHAT_SHOW_IMPORT },
	]);
	assertEquals(fixture.counters.closeCalls, 1);
});

Deno.test("popup exits early when required action buttons are unavailable", async () => {
	const { runPopup } = await loadPopupRuntime();
	const window = createMockWindow(
		"https://example.test/action/popup/popup.html",
	);
	const document = window.document;
	appendElement(document, "button", "import");
	appendElement(document, "button", "export");
	appendElement(document, "button", "open-settings");
	appendElement(document, "button", "manage-tabs");
	const documentRef = {
		getElementById(id: string) {
			if (id === "tutorial") {
				return null;
			}
			return document.getElementById(id);
		},
	};
	const messages: Record<string, unknown>[] = [];

	const result = await runPopup({
		areFramePatternsAllowedFn: () => Promise.resolve(true),
		browser: {
			runtime: {
				getURL: (path: string) => `chrome-extension://test/${path}`,
			},
		},
		documentRef,
		isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
		locationRef: window.location,
		sendExtensionMessageFn: (
			message: Record<string, unknown>,
		) => {
			messages.push(message);
			return Promise.resolve([]);
		},
	});

	assertEquals(result.redirected, false);
	assertEquals(messages.length, 0);
});
