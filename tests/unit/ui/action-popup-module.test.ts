import "../../mocks.test.ts";
import { assertEquals } from "@std/testing/asserts";
import {
	createPopupModule,
	runPopup,
} from "../../../src/action/popup/popup-module.js";
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
 * Loads the popup module with isolated dependencies and returns interaction handles.
 *
 * @param {Object} options Fixture options.
 * @param {Command[]} [options.availableCommands=[]] Commands returned by the command-list message.
 * @param {Command[] | null | undefined} [options.commandResponse=availableCommands] Explicit command-list response.
 * @param {string | null} [options.exportDataset="popup_export+-+extra"] Export button translation dataset.
 * @param {boolean} [options.framePatternsAllowed=true] Whether iframe host permissions are allowed.
 * @param {string | null} [options.importDataset="popup_import+-+extra"] Import button translation dataset.
 * @param {{ison: boolean; url?: string | null}} [options.salesforceState={ ison: true }] Salesforce setup detection result.
 * @param {string | null} [options.settingsDataset="popup_settings+-+extra"] Settings button translation dataset.
 * @param {boolean} [options.useCreatePopupModule=false] Whether to execute via `createPopupModule`.
 * @return {Promise<{ counters: { closeCalls: number; openSettingsCalls: number }; exportButton: MockElement; importButton: MockElement; locationRef: URL; manageTabsButton: MockElement; messages: Record<string, unknown>[]; settingsButton: MockElement; tutorialButton: MockElement; }>} Popup fixture.
 */
async function loadPopupModule({
	availableCommands = [],
	commandResponse = availableCommands,
	exportDataset = "popup_export+-+extra",
	framePatternsAllowed = true,
	importDataset = "popup_import+-+extra",
	salesforceState = { ison: true },
	settingsDataset = "popup_settings+-+extra",
	useCreatePopupModule = false,
}: {
	availableCommands?: Command[];
	commandResponse?: Command[] | null;
	exportDataset?: string | null;
	framePatternsAllowed?: boolean;
	importDataset?: string | null;
	salesforceState?: { ison: boolean; url?: string | null };
	settingsDataset?: string | null;
	useCreatePopupModule?: boolean;
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

	const popupOptions = {
		areFramePatternsAllowedFn: () => Promise.resolve(framePatternsAllowed),
		browser: {
			runtime: {
				getURL: (path: string) => `chrome-extension://test/${path}`,
			},
		},
		closePopupFn: () => {
			counters.closeCalls++;
		},
		cmdExportAll: CMD_EXPORT_ALL,
		cmdImport: CMD_IMPORT,
		cmdOpenSettings: CMD_OPEN_SETTINGS,
		cxmManageTabs: CXM_MANAGE_TABS,
		documentRef: document,
		getTranslationsFn: (message: string | string[]) =>
			Promise.resolve(message),
		isOnSalesforceSetupFn: () => Promise.resolve(salesforceState),
		locationRef: window.location as URL,
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
		whatExportCheck: WHAT_EXPORT_CHECK,
		whatGetCommands: WHAT_GET_COMMANDS,
		whatShowImport: WHAT_SHOW_IMPORT,
		whatStartTutorial: WHAT_START_TUTORIAL,
	};

	if (useCreatePopupModule) {
		const popupModule = createPopupModule(popupOptions);
		await popupModule.runPopup();
	} else {
		await runPopup(popupOptions);
	}

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

Deno.test("popup-module redirects to host permissions when setup frame patterns are blocked", async () => {
	const fixture = await loadPopupModule({
		framePatternsAllowed: false,
		salesforceState: { ison: true },
	});

	assertEquals(
		fixture.locationRef.href,
		"chrome-extension://test/action/req_permissions/req_permissions.html?whichid=hostpermissions",
	);
});

Deno.test("popup-module redirects to notSalesforceSetup with url when the current tab is outside setup", async () => {
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

Deno.test("popup-module omits the notSalesforceSetup url query when no url is available", async () => {
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

Deno.test("popup-module createPopupModule wrapper wires command titles and action buttons", async () => {
	const fixture = await loadPopupModule({
		availableCommands: [
			{ name: CMD_IMPORT, shortcut: "Ctrl+I" },
			{ name: CMD_EXPORT_ALL, shortcut: "Ctrl+E" },
			{ name: CMD_OPEN_SETTINGS, shortcut: "Ctrl+S" },
			{ name: "cmd-unknown", shortcut: "Ctrl+U" },
		],
		salesforceState: { ison: true },
		useCreatePopupModule: true,
	});

	assertEquals(String(fixture.importButton.title), "popup_import,(Ctrl+I)");
	assertEquals(String(fixture.exportButton.title), "popup_export,(Ctrl+E)");
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

Deno.test("popup-module keeps shortcut title wiring stable when translation datasets are incomplete", async () => {
	const fixture = await loadPopupModule({
		availableCommands: [
			{ name: CMD_IMPORT, shortcut: "Ctrl+I" },
			{ name: CMD_OPEN_SETTINGS, shortcut: "Ctrl+S" },
		],
		importDataset: null,
		settingsDataset: "popup_settings",
	});

	assertEquals(String(fixture.importButton.title), ",(Ctrl+I)");
	assertEquals(
		String(fixture.settingsButton.title),
		"popup_settings,(Ctrl+S)",
	);
});

Deno.test("popup-module skips command-title updates when the command response is invalid", async () => {
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

Deno.test("popup-module exits early when one required popup button is unavailable", async () => {
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
		cmdExportAll: CMD_EXPORT_ALL,
		cmdImport: CMD_IMPORT,
		cmdOpenSettings: CMD_OPEN_SETTINGS,
		documentRef,
		isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
		locationRef: window.location as URL,
		sendExtensionMessageFn: (message: Record<string, unknown>) => {
			messages.push(message);
			return Promise.resolve([]);
		},
		whatExportCheck: WHAT_EXPORT_CHECK,
		whatGetCommands: WHAT_GET_COMMANDS,
		whatShowImport: WHAT_SHOW_IMPORT,
		whatStartTutorial: WHAT_START_TUTORIAL,
	});

	assertEquals(result.redirected, false);
	assertEquals(messages.length, 0);
});

Deno.test("popup-module runPopup supports explicit requestedCommands overrides", async () => {
	const window = createMockWindow(
		"https://example.test/action/popup/popup.html",
	);
	const document = window.document;
	appendElement(document, "button", "import");
	appendElement(document, "button", "export");
	appendElement(document, "button", "open-settings");
	appendElement(document, "button", "manage-tabs");
	appendElement(document, "button", "tutorial");
	const messages: Record<string, unknown>[] = [];

	await runPopup({
		areFramePatternsAllowedFn: () => Promise.resolve(true),
		browser: {
			runtime: {
				getURL: (path: string) => path,
			},
		},
		cmdExportAll: CMD_EXPORT_ALL,
		cmdImport: CMD_IMPORT,
		cmdOpenSettings: CMD_OPEN_SETTINGS,
		documentRef: document,
		isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
		locationRef: window.location as URL,
		requestedCommands: ["one", "two"],
		sendExtensionMessageFn: (message: Record<string, unknown>) => {
			messages.push(message);
			return Promise.resolve([]);
		},
		whatExportCheck: WHAT_EXPORT_CHECK,
		whatGetCommands: WHAT_GET_COMMANDS,
		whatShowImport: WHAT_SHOW_IMPORT,
		whatStartTutorial: WHAT_START_TUTORIAL,
	});

	assertEquals(messages, [{
		what: WHAT_GET_COMMANDS,
		commands: ["one", "two"],
	}]);
});

Deno.test("popup-module runPopup default fallbacks redirect safely with no overrides", async () => {
	const result = await runPopup();
	assertEquals(result.redirected, true);
});

Deno.test("popup-module runPopup default handlers remain safe with partial overrides", async () => {
	const window = createMockWindow(
		"https://example.test/action/popup/popup.html",
	);
	const document = window.document;
	const importButton = appendElement(document, "button", "import");
	const exportButton = appendElement(document, "button", "export");
	const settingsButton = appendElement(document, "button", "open-settings");
	const manageTabsButton = appendElement(document, "button", "manage-tabs");
	const tutorialButton = appendElement(document, "button", "tutorial");
	exportButton.dataset.i18n = "popup_export+-+extra";

	const messages: Record<string, unknown>[] = [];

	await runPopup({
		documentRef: document,
		isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
		locationRef: window.location as URL,
		sendExtensionMessageFn: (message: Record<string, unknown>) => {
			messages.push(message);
			if (message.what === "") {
				return Promise.resolve([{ name: "", shortcut: "Ctrl+0" }]);
			}
			return Promise.resolve(undefined);
		},
	});

	await importButton.click();
	await exportButton.click();
	await settingsButton.click();
	await manageTabsButton.click();
	await tutorialButton.click();

	assertEquals(String(exportButton.title), "popup_export,(Ctrl+0)");
	assertEquals(messages, [
		{ what: "", commands: [] },
		{ what: "" },
		{ what: "" },
		{ what: "" },
		{ what: "" },
	]);
});

Deno.test("popup-module fallback document safely handles setup flow when no buttons are present", async () => {
	const result = await runPopup({
		isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
	});
	assertEquals(result.redirected, false);
});

Deno.test("popup-module setup flow can rely on the default message sender", async () => {
	const window = createMockWindow(
		"https://example.test/action/popup/popup.html",
	);
	const document = window.document;
	appendElement(document, "button", "import");
	appendElement(document, "button", "export");
	appendElement(document, "button", "open-settings");
	appendElement(document, "button", "manage-tabs");
	appendElement(document, "button", "tutorial");

	const result = await runPopup({
		documentRef: document,
		isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
		locationRef: window.location as URL,
	});

	assertEquals(result.redirected, false);
});
