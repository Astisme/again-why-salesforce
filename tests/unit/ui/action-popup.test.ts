import { assertEquals } from "@std/testing/asserts";
import {
	createMockWindow,
	MockDocument,
	MockElement,
} from "./mock-dom.test.ts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";

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
	TranslationService: {
		TRANSLATE_DATASET: string;
		TRANSLATE_SEPARATOR: string;
	};
	areFramePatternsAllowed: () => Promise<boolean>;
	ensureTranslatorAvailability: () => Promise<{
		separator: string;
		translate: (
			message: string | string[],
			connector?: string,
		) => Promise<string>;
		translateAttributeDataset: string;
	}>;
	getTranslations: (
		message: string | string[],
		connector?: string,
	) => Promise<string | string[]>;
	getTranslatorAttribute: (attribute: string) => string | null;
	isOnSalesforceSetup: () => Promise<{ ison: boolean; url?: string | null }>;
	openSettingsPage: () => void;
	sendExtensionMessage: (
		message: Record<string, unknown>,
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
	let translatorInstance:
		| Promise<{
			separator: string;
			translate: (
				message: string | string[],
				connector?: string,
			) => Promise<string>;
			translateAttributeDataset: string;
		}>
		| null = null;
	const ensureTranslatorAvailability = () => {
		if (translatorInstance == null) {
			counters.translatorCalls++;
			translatorInstance = Promise.resolve({
				separator: "+-+",
				translate: (message, connector = " ") =>
					Promise.resolve(
						Array.isArray(message)
							? message.join(connector)
							: `translated:${message}`,
					),
				translateAttributeDataset: "i18n",
			});
		}
		return translatorInstance;
	};

	const { cleanup } = await loadIsolatedModule<
		Record<string, never>,
		PopupDependencies
	>({
		modulePath: new URL(
			"../../../src/action/popup/popup.js",
			import.meta.url,
		),
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
			TranslationService: {
				TRANSLATE_DATASET: "i18n",
				TRANSLATE_SEPARATOR: "+-+",
			},
			areFramePatternsAllowed: () =>
				Promise.resolve(framePatternsAllowed),
			ensureTranslatorAvailability,
			getTranslations: (message, _connector = " ") => {
				if (Array.isArray(message)) {
					return Promise.resolve(message);
				}
				return Promise.resolve(message);
			},
			getTranslatorAttribute: (attribute) => {
				switch (attribute) {
					case "separator":
						return "+-+";
					case "translateAttributeDataset":
						return "i18n";
					default:
						return null;
				}
			},
			isOnSalesforceSetup: () => Promise.resolve(salesforceState),
			openSettingsPage: () => {
				counters.openSettingsCalls++;
			},
			sendExtensionMessage: (message) => {
				messages.push(message);
				if (message.what === "get-commands") {
					return Promise.resolve(availableCommands);
				}
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
			"/core/constants.js",
			"/core/functions.js",
			"/core/translator.js",
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
		assertEquals(fixture.counters.translatorCalls, 0);
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
