import "../../mocks.test.ts";
import { assertEquals } from "@std/testing/asserts";
import {
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_SETTINGS,
	CXM_MANAGE_TABS,
	WHAT_EXPORT_CHECK,
	WHAT_GET_COMMANDS,
	WHAT_SHOW_IMPORT,
	WHAT_START_TUTORIAL,
} from "../../../src/core/constants.js";
import {
	createPopupModule,
	runPopup,
	runPopupWithInjectedOptions,
} from "../../../src/action/popup/popup-runtime.js";
import {
	createMockWindow,
	MockDocument,
	MockElement,
} from "./mock-dom.test.ts";

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
 * Creates all popup action buttons on the mock page and returns references.
 *
 * @param {MockDocument} document Mock document.
 * @return {{ exportButton: MockElement; importButton: MockElement; manageTabsButton: MockElement; settingsButton: MockElement; tutorialButton: MockElement; }} Button references.
 */
function appendPopupButtons(document: MockDocument) {
	const importButton = appendElement(document, "button", "import");
	const exportButton = appendElement(document, "button", "export");
	const settingsButton = appendElement(document, "button", "open-settings");
	const manageTabsButton = appendElement(document, "button", "manage-tabs");
	const tutorialButton = appendElement(document, "button", "tutorial");
	return {
		exportButton,
		importButton,
		manageTabsButton,
		settingsButton,
		tutorialButton,
	};
}

Deno.test("popup-runtime createPopupModule wires runtime constants through the pure module", async () => {
	const window = createMockWindow(
		"https://example.test/action/popup/popup.html",
	);
	const document = window.document;
	const {
		exportButton,
		importButton,
		manageTabsButton,
		settingsButton,
		tutorialButton,
	} = appendPopupButtons(document);
	importButton.dataset.i18n = "popup_import+-+extra";
	exportButton.dataset.i18n = "popup_export+-+extra";
	settingsButton.dataset.i18n = "popup_settings+-+extra";
	const counters = {
		closeCalls: 0,
		openSettingsCalls: 0,
	};
	const messages: Record<string, unknown>[] = [];

	const popupModule = createPopupModule({
		areFramePatternsAllowedFn: () => Promise.resolve(true),
		browser: {
			runtime: {
				getURL: (path: string) => `chrome-extension://test/${path}`,
			},
		},
		closePopupFn: () => {
			counters.closeCalls++;
		},
		documentRef: document,
		getTranslationsFn: (message: string | string[]) =>
			Promise.resolve(message),
		isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
		locationRef: window.location as URL,
		openSettingsPageFn: () => {
			counters.openSettingsCalls++;
		},
		sendExtensionMessageFn: (message: Record<string, unknown>) => {
			messages.push(message);
			if (message.what === WHAT_GET_COMMANDS) {
				return Promise.resolve([
					{ name: CMD_IMPORT, shortcut: "Ctrl+I" },
					{ name: CMD_EXPORT_ALL, shortcut: "Ctrl+E" },
					{ name: CMD_OPEN_SETTINGS, shortcut: "Ctrl+S" },
				]);
			}
			return Promise.resolve(undefined);
		},
		translationDataset: "i18n",
		translationSeparator: "+-+",
	});

	await popupModule.runPopup();
	await importButton.click();
	await exportButton.click();
	await settingsButton.click();
	await manageTabsButton.click();
	await tutorialButton.click();

	assertEquals(messages, [
		{
			what: WHAT_GET_COMMANDS,
			commands: [CMD_EXPORT_ALL, CMD_IMPORT, CMD_OPEN_SETTINGS],
		},
		{ what: WHAT_SHOW_IMPORT },
		{ what: WHAT_EXPORT_CHECK },
		{ what: CXM_MANAGE_TABS },
		{ what: WHAT_START_TUTORIAL },
	]);
	assertEquals(counters.closeCalls, 4);
	assertEquals(counters.openSettingsCalls, 1);
	assertEquals(String(importButton.title), "popup_import,(Ctrl+I)");
	assertEquals(String(exportButton.title), "popup_export,(Ctrl+E)");
	assertEquals(String(settingsButton.title), "popup_settings,(Ctrl+S)");
});

Deno.test("popup-runtime runPopup keeps runtime redirect behavior for host and non-setup tabs", async (t) => {
	await t.step(
		"redirects to host permissions when setup frame patterns are blocked",
		async () => {
			const window = createMockWindow(
				"https://example.test/action/popup/popup.html",
			);
			appendPopupButtons(window.document);

			await runPopup({
				areFramePatternsAllowedFn: () => Promise.resolve(false),
				browser: {
					runtime: {
						getURL: (path: string) =>
							`chrome-extension://test/${path}`,
					},
				},
				documentRef: window.document,
				isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
				locationRef: window.location as URL,
			});

			assertEquals(
				window.location.href,
				"chrome-extension://test/action/req_permissions/req_permissions.html?whichid=hostpermissions",
			);
		},
	);

	await t.step(
		"redirects to non-setup popup page and preserves the source tab url",
		async () => {
			const window = createMockWindow(
				"https://example.test/action/popup/popup.html",
			);
			appendPopupButtons(window.document);

			await runPopup({
				areFramePatternsAllowedFn: () => Promise.resolve(true),
				browser: {
					runtime: {
						getURL: (path: string) =>
							`chrome-extension://test/${path}`,
					},
				},
				documentRef: window.document,
				isOnSalesforceSetupFn: () =>
					Promise.resolve({
						ison: false,
						url: "https://example.com/page",
					}),
				locationRef: window.location as URL,
			});

			assertEquals(
				window.location.href,
				"chrome-extension://test/action/notSalesforceSetup/notSalesforceSetup.html?url=https://example.com/page",
			);
		},
	);
});

Deno.test("popup-runtime runPopupWithInjectedOptions bypasses runtime constants and uses explicit injected values", async () => {
	const window = createMockWindow(
		"https://example.test/action/popup/popup.html",
	);
	const document = window.document;
	const { importButton } = appendPopupButtons(document);
	const messages: Record<string, unknown>[] = [];

	await runPopupWithInjectedOptions({
		areFramePatternsAllowedFn: () => Promise.resolve(true),
		browser: {
			runtime: {
				getURL: (path: string) => path,
			},
		},
		cmdExportAll: "custom-export",
		cmdImport: "custom-import",
		cmdOpenSettings: "custom-settings",
		cxmManageTabs: "custom-manage-tabs",
		documentRef: document,
		isOnSalesforceSetupFn: () => Promise.resolve({ ison: true }),
		locationRef: window.location as URL,
		sendExtensionMessageFn: (message: Record<string, unknown>) => {
			messages.push(message);
			if (message.what === "custom-get-commands") {
				return Promise.resolve([{
					name: "custom-import",
					shortcut: "I",
				}]);
			}
			return Promise.resolve(undefined);
		},
		whatExportCheck: "custom-export-check",
		whatGetCommands: "custom-get-commands",
		whatShowImport: "custom-show-import",
		whatStartTutorial: "custom-start-tutorial",
	});

	await importButton.click();

	assertEquals(messages, [
		{
			what: "custom-get-commands",
			commands: ["custom-export", "custom-import", "custom-settings"],
		},
		{ what: "custom-show-import" },
	]);
});
