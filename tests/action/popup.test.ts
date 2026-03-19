import { assertEquals } from "@std/testing/asserts";
import { createMockWindow, MockDocument, MockElement } from "./mock-dom.ts";
import { loadIsolatedModule } from "../load-isolated-module.ts";

type Command = {
	name: string;
	shortcut: string;
};

type PopupDependencies = {
	BROWSER: {
		runtime: {
			getURL: (path: string) => string;
		};
	};
	CMD_EXPORT_ALL: string;
	CMD_IMPORT: string;
	CMD_OPEN_SETTINGS: string;
	CXM_MANAGE_TABS: string;
	WHAT_EXPORT_CHECK: string;
	WHAT_GET_COMMANDS: string;
	WHAT_SHOW_IMPORT: string;
	WHAT_START_TUTORIAL: string;
	areFramePatternsAllowed: () => Promise<boolean>;
	ensureTranslatorAvailability: () => Promise<{
		separator: string;
		translate: (message: string | string[]) => Promise<string>;
		translateAttributeDataset: string;
	}>;
	isOnSalesforceSetup: () => Promise<{ ison: boolean; url?: string | null }>;
	openSettingsPage: () => void;
	sendExtensionMessage: (
		message: Record<string, unknown>,
		callback?: () => void,
	) => Promise<Command[] | undefined> | undefined;
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
) {
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
 * @param {boolean} [options.framePatternsAllowed=true] Whether frame patterns are allowed.
 * @param {{ison: boolean; url?: string | null}} [options.salesforceState={ ison: true }] Salesforce setup detection result.
 * @return {Promise<{ cleanup: () => void; counters: { closeCalls: number; openSettingsCalls: number; translatorCalls: number; }; exportButton: MockElement; importButton: MockElement; locationRef: URL; manageTabsButton: MockElement; messages: Record<string, unknown>[]; settingsButton: MockElement; tutorialButton: MockElement; }>} Loaded popup fixture.
 */
async function loadPopupModule({
	availableCommands = [],
	framePatternsAllowed = true,
	salesforceState = { ison: true },
}: {
	availableCommands?: Command[];
	framePatternsAllowed?: boolean;
	salesforceState?: { ison: boolean; url?: string | null };
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
	importButton.dataset.i18n = "popup_import+-+extra";
	exportButton.dataset.i18n = "popup_export+-+extra";
	settingsButton.dataset.i18n = "popup_settings+-+extra";
	const counters = {
		closeCalls: 0,
		openSettingsCalls: 0,
		translatorCalls: 0,
	};
	const messages: Record<string, unknown>[] = [];

	const { cleanup } = await loadIsolatedModule<
		Record<string, never>,
		PopupDependencies
	>({
		modulePath: new URL("../../src/action/popup/popup.js", import.meta.url),
		dependencies: {
			BROWSER: {
				runtime: {
					getURL: (path) => `chrome-extension://test/${path}`,
				},
			},
			CMD_EXPORT_ALL: "cmd-export-all",
			CMD_IMPORT: "cmd-import",
			CMD_OPEN_SETTINGS: "cmd-open-settings",
			CXM_MANAGE_TABS: "manage-tabs",
			WHAT_EXPORT_CHECK: "export-check",
			WHAT_GET_COMMANDS: "get-commands",
			WHAT_SHOW_IMPORT: "show-import",
			WHAT_START_TUTORIAL: "start-tutorial",
			areFramePatternsAllowed: async () => framePatternsAllowed,
			ensureTranslatorAvailability: async () => {
				counters.translatorCalls++;
				return {
					separator: "+-+",
					translate: async (message) =>
						Array.isArray(message)
							? message.join(" ")
							: `translated:${message}`,
					translateAttributeDataset: "i18n",
				};
			},
			isOnSalesforceSetup: async () => salesforceState,
			openSettingsPage: () => {
				counters.openSettingsCalls++;
			},
			sendExtensionMessage: (message, callback) => {
				messages.push(message);
				if (message.what === "get-commands") {
					return Promise.resolve(availableCommands);
				}
				callback?.();
				return Promise.resolve(undefined);
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
			"/components/theme-selector/theme-selector.js",
		]),
	});

	return {
		cleanup,
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

	try {
		assertEquals(
			fixture.locationRef.href,
			"chrome-extension://test/action/req_permissions/req_permissions.html?whichid=hostpermissions",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("popup redirects to the non-Salesforce page when the current tab is not Salesforce setup", async () => {
	const fixture = await loadPopupModule({
		salesforceState: {
			ison: false,
			url: "https://example.com/page",
		},
	});

	try {
		assertEquals(
			fixture.locationRef.href,
			"chrome-extension://test/action/notSalesforceSetup/notSalesforceSetup.html?url=https://example.com/page",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("popup omits the url query string when Salesforce setup detection returns no page url", async () => {
	const fixture = await loadPopupModule({
		salesforceState: {
			ison: false,
			url: null,
		},
	});

	try {
		assertEquals(
			fixture.locationRef.href,
			"chrome-extension://test/action/notSalesforceSetup/notSalesforceSetup.html",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("popup wires command titles and action buttons in the normal setup flow", async () => {
	const fixture = await loadPopupModule({
		availableCommands: [
			{ name: "cmd-import", shortcut: "Ctrl+I" },
			{ name: "cmd-export-all", shortcut: "Ctrl+E" },
			{ name: "cmd-open-settings", shortcut: "Ctrl+S" },
			{ name: "cmd-unknown", shortcut: "Ctrl+U" },
		],
		salesforceState: { ison: true },
	});

	try {
		assertEquals(fixture.counters.translatorCalls, 1);
		assertEquals(fixture.importButton.title, "popup_import (Ctrl+I)");
		assertEquals(fixture.exportButton.title, "popup_export (Ctrl+E)");
		assertEquals(fixture.settingsButton.title, "popup_settings (Ctrl+S)");

		fixture.importButton.click();
		fixture.exportButton.click();
		fixture.settingsButton.click();
		fixture.manageTabsButton.click();
		fixture.tutorialButton.click();

		assertEquals(fixture.messages, [
			{
				what: "get-commands",
				commands: ["cmd-export-all", "cmd-import", "cmd-open-settings"],
			},
			{ what: "show-import" },
			{ what: "export-check" },
			{ what: "manage-tabs" },
			{ what: "start-tutorial" },
		]);
		assertEquals(fixture.counters.closeCalls, 4);
		assertEquals(fixture.counters.openSettingsCalls, 1);
	} finally {
		fixture.cleanup();
	}
});
