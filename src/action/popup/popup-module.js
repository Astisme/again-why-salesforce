"use strict";

import {
	BROWSER as _BROWSER,
	CMD_EXPORT_ALL as _CMD_EXPORT_ALL,
	CMD_IMPORT as _CMD_IMPORT,
	CMD_OPEN_SETTINGS as _CMD_OPEN_SETTINGS,
	CXM_MANAGE_TABS as _CXM_MANAGE_TABS,
	WHAT_EXPORT_CHECK as _WHAT_EXPORT_CHECK,
	WHAT_GET_COMMANDS as _WHAT_GET_COMMANDS,
	WHAT_SHOW_IMPORT as _WHAT_SHOW_IMPORT,
	WHAT_START_TUTORIAL as _WHAT_START_TUTORIAL,
} from "../../core/constants.js";
import {
	areFramePatternsAllowed as _areFramePatternsAllowed,
	isOnSalesforceSetup as _isOnSalesforceSetup,
	openSettingsPage as _openSettingsPage,
	sendExtensionMessage as _sendExtensionMessage,
} from "../../core/functions.js";
import {
	getTranslations as _getTranslations,
	TranslationService as _TranslationService,
} from "../../core/translator.js";

const HOST_PERMISSIONS_REDIRECT =
	"action/req_permissions/req_permissions.html?whichid=hostpermissions";
const NOT_SALESFORCE_SETUP_REDIRECT =
	"action/notSalesforceSetup/notSalesforceSetup.html";

const POPUP_BUTTON_IDS = {
	export: "export",
	import: "import",
	manageTabs: "manage-tabs",
	settings: "open-settings",
	tutorial: "tutorial",
};

const FALLBACK_DOCUMENT_REF = {
	getElementById() {
		return null;
	},
};

const FALLBACK_LOCATION_REF = {
	href: "",
};

const FALLBACK_BROWSER = {
	runtime: {
		getURL(path) {
			return path;
		},
	},
};

/**
 * Returns the translation key segment before the translator separator.
 *
 * @param {string|undefined} i18n Raw `data-i18n` value from the button.
 * @param {string} separator Configured translator separator.
 * @return {string} Translation key segment.
 */
function sliceBeforeSeparator(i18n, separator) {
	if (typeof i18n !== "string") {
		return "";
	}
	const separatorIndex = i18n.indexOf(separator);
	return separatorIndex === -1 ? i18n : i18n.slice(0, separatorIndex);
}

/**
 * Builds command ids used by the popup shortcut lookup.
 *
 * @param {Object} options Input values.
 * @param {string} [options.cmdExportAll=""] Export command id.
 * @param {string} [options.cmdImport=""] Import command id.
 * @param {string} [options.cmdOpenSettings=""] Settings command id.
 * @param {string[] | null} [options.requestedCommands=null] Explicit command list.
 * @return {string[]} Command ids to request.
 */
function buildRequestedCommands({
	cmdExportAll = "",
	cmdImport = "",
	cmdOpenSettings = "",
	requestedCommands = null,
} = {}) {
	if (Array.isArray(requestedCommands)) {
		return requestedCommands;
	}
	return [cmdExportAll, cmdImport, cmdOpenSettings].filter((commandId) =>
		typeof commandId === "string" && commandId !== ""
	);
}

/**
 * Sends a popup message and closes the popup window.
 *
 * @param {(message: Record<string, unknown>) => Promise<unknown> | unknown} sendExtensionMessageFn Message dispatcher.
 * @param {() => void} closePopupFn Close callback.
 * @param {Record<string, unknown>} message Runtime message to send.
 * @return {Promise<void>} Resolves when the message has been sent and popup close has been requested.
 */
async function sendMessageAndClose(
	sendExtensionMessageFn,
	closePopupFn,
	message,
) {
	await sendExtensionMessageFn(message);
	closePopupFn();
}

/**
 * Builds translated shortcut text for a popup action button.
 *
 * @param {{ dataset: Record<string, string> }} button Target button.
 * @param {string} shortcut Shortcut text from command metadata.
 * @param {(message: string | string[], connector?: string) => Promise<string | string[]>} getTranslationsFn Translator function.
 * @param {string} translationDataset Dataset key that stores translation instructions.
 * @param {string} translationSeparator Separator used in the translation dataset.
 * @return {Promise<string | string[]>} Translated shortcut text.
 */
function addShortcutText(
	button,
	shortcut,
	getTranslationsFn,
	translationDataset,
	translationSeparator,
) {
	return getTranslationsFn([
		sliceBeforeSeparator(
			button.dataset[translationDataset],
			translationSeparator,
		),
		`(${shortcut})`,
	]);
}

/**
 * Resolves and validates required popup buttons.
 *
 * @param {{ getElementById: (id: string) => {
 *   addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *   dataset: Record<string, string>;
 *   title: string;
 * } | null }} documentRef Document-like host for popup buttons.
 * @param {{
 *   export: string;
 *   import: string;
 *   manageTabs: string;
 *   settings: string;
 *   tutorial: string;
 * }} popupButtonIds Popup button id map.
 * @return {{
 *   exportBtn: {
 *     addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *     dataset: Record<string, string>;
 *     title: string;
 *   } | null;
 *   importBtn: {
 *     addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *     dataset: Record<string, string>;
 *     title: string;
 *   } | null;
 *   manageTabsBtn: {
 *     addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *     dataset: Record<string, string>;
 *     title: string;
 *   } | null;
 *   settingsBtn: {
 *     addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *     dataset: Record<string, string>;
 *     title: string;
 *   } | null;
 *   tutorialBtn: {
 *     addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *     dataset: Record<string, string>;
 *     title: string;
 *   } | null;
 * }} Popup buttons.
 */
function getPopupButtons(documentRef, popupButtonIds) {
	return {
		exportBtn: documentRef.getElementById(popupButtonIds.export),
		importBtn: documentRef.getElementById(popupButtonIds.import),
		manageTabsBtn: documentRef.getElementById(popupButtonIds.manageTabs),
		settingsBtn: documentRef.getElementById(popupButtonIds.settings),
		tutorialBtn: documentRef.getElementById(popupButtonIds.tutorial),
	};
}

/**
 * Executes popup startup behavior with injectable dependencies.
 *
 * @param {Object} [options={}] Runtime overrides used by tests/runtime.
 * @param {{ runtime: { getURL: (path: string) => string } }} [options.browser] Browser API object.
 * @param {() => Promise<boolean>} [options.areFramePatternsAllowedFn] Frame permission checker.
 * @param {() => void} [options.closePopupFn] Popup close callback.
 * @param {{ getElementById: (id: string) => {
 *   addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *   dataset: Record<string, string>;
 *   title: string;
 * } | null }} [options.documentRef] Popup document-like object.
 * @param {(message: string | string[], connector?: string) => Promise<string | string[]>} [options.getTranslationsFn] Translation function.
 * @param {() => Promise<{ison: boolean; url?: string | null}>} [options.isOnSalesforceSetupFn] Salesforce setup detector.
 * @param {{ href: string }} [options.locationRef] Mutable location object for redirects.
 * @param {() => void} [options.openSettingsPageFn] Settings opener.
 * @param {(message: Record<string, unknown>) => Promise<unknown> | unknown} [options.sendExtensionMessageFn] Extension message sender.
 * @param {string} [options.translationDataset="i18n"] Dataset key for translation attributes.
 * @param {string} [options.translationSeparator="+-+"] Separator in translation attributes.
 * @param {string} [options.cmdExportAll=""] Export command id.
 * @param {string} [options.cmdImport=""] Import command id.
 * @param {string} [options.cmdOpenSettings=""] Settings command id.
 * @param {string} [options.cxmManageTabs=""] Manage-tabs message id.
 * @param {string} [options.whatExportCheck=""] Export-check message id.
 * @param {string} [options.whatGetCommands=""] Get-commands message id.
 * @param {string} [options.whatShowImport=""] Show-import message id.
 * @param {string} [options.whatStartTutorial=""] Start-tutorial message id.
 * @param {string} [options.hostPermissionsRedirect=HOST_PERMISSIONS_REDIRECT] Host-permissions redirect path.
 * @param {string} [options.notSalesforceSetupRedirect=NOT_SALESFORCE_SETUP_REDIRECT] Not-salesforce redirect path.
 * @param {{
 *   export: string;
 *   import: string;
 *   manageTabs: string;
 *   settings: string;
 *   tutorial: string;
 * }} [options.popupButtonIds=POPUP_BUTTON_IDS] Popup button id map.
 * @param {string[] | null} [options.requestedCommands=null] Explicit commands to request.
 * @return {Promise<{ redirected: boolean }>} Redirect status.
 */
async function runPopupImpl({
	browser = FALLBACK_BROWSER,
	areFramePatternsAllowedFn = () => Promise.resolve(true),
	closePopupFn = () => {},
	documentRef = FALLBACK_DOCUMENT_REF,
	getTranslationsFn = (message) => Promise.resolve(message),
	isOnSalesforceSetupFn = () => Promise.resolve({ ison: false }),
	locationRef = FALLBACK_LOCATION_REF,
	openSettingsPageFn = () => {},
	sendExtensionMessageFn = () => Promise.resolve(undefined),
	translationDataset = "i18n",
	translationSeparator = "+-+",
	cmdExportAll = "",
	cmdImport = "",
	cmdOpenSettings = "",
	cxmManageTabs = "",
	whatExportCheck = "",
	whatGetCommands = "",
	whatShowImport = "",
	whatStartTutorial = "",
	hostPermissionsRedirect = HOST_PERMISSIONS_REDIRECT,
	notSalesforceSetupRedirect = NOT_SALESFORCE_SETUP_REDIRECT,
	popupButtonIds = POPUP_BUTTON_IDS,
	requestedCommands = null,
} = {}) {
	const isOnSalesforceSetupResult = await isOnSalesforceSetupFn();
	if (isOnSalesforceSetupResult.ison) {
		if (!(await areFramePatternsAllowedFn())) {
			locationRef.href = browser.runtime.getURL(hostPermissionsRedirect);
			return { redirected: true };
		}
	} else {
		locationRef.href = browser.runtime.getURL(
			`${notSalesforceSetupRedirect}${
				isOnSalesforceSetupResult.url == null
					? ""
					: `?url=${isOnSalesforceSetupResult.url}`
			}`,
		);
		return { redirected: true };
	}
	const {
		exportBtn,
		importBtn,
		manageTabsBtn,
		settingsBtn,
		tutorialBtn,
	} = getPopupButtons(documentRef, popupButtonIds);
	if (
		importBtn == null ||
		exportBtn == null ||
		settingsBtn == null ||
		manageTabsBtn == null ||
		tutorialBtn == null
	) {
		return { redirected: false };
	}
	importBtn.addEventListener(
		"click",
		() =>
			sendMessageAndClose(
				sendExtensionMessageFn,
				closePopupFn,
				{ what: whatShowImport },
			),
	);
	exportBtn.addEventListener(
		"click",
		() =>
			sendMessageAndClose(
				sendExtensionMessageFn,
				closePopupFn,
				{ what: whatExportCheck },
			),
	);
	settingsBtn.addEventListener("click", openSettingsPageFn);
	manageTabsBtn.addEventListener(
		"click",
		() =>
			sendMessageAndClose(
				sendExtensionMessageFn,
				closePopupFn,
				{ what: cxmManageTabs },
			),
	);
	tutorialBtn.addEventListener(
		"click",
		() =>
			sendMessageAndClose(
				sendExtensionMessageFn,
				closePopupFn,
				{ what: whatStartTutorial },
			),
	);
	const availableCommands = await sendExtensionMessageFn({
		what: whatGetCommands,
		commands: buildRequestedCommands({
			cmdExportAll,
			cmdImport,
			cmdOpenSettings,
			requestedCommands,
		}),
	});
	if (!Array.isArray(availableCommands)) {
		return { redirected: false };
	}
	for (const availableCommand of availableCommands) {
		switch (availableCommand.name) {
			case cmdExportAll:
				exportBtn.title = await addShortcutText(
					exportBtn,
					availableCommand.shortcut,
					getTranslationsFn,
					translationDataset,
					translationSeparator,
				);
				break;
			case cmdImport:
				importBtn.title = await addShortcutText(
					importBtn,
					availableCommand.shortcut,
					getTranslationsFn,
					translationDataset,
					translationSeparator,
				);
				break;
			case cmdOpenSettings:
				settingsBtn.title = await addShortcutText(
					settingsBtn,
					availableCommand.shortcut,
					getTranslationsFn,
					translationDataset,
					translationSeparator,
				);
				break;
			default:
				break;
		}
	}
	return { redirected: false };
}

/**
 * Builds runtime defaults for popup wiring.
 *
 * @return {Object} Runtime popup defaults.
 */
export function getPopupRuntimeDefaults() {
	return {
		browser: _BROWSER,
		areFramePatternsAllowedFn: _areFramePatternsAllowed,
		closePopupFn: globalThis.close ?? (() => {}),
		documentRef: globalThis.document ?? FALLBACK_DOCUMENT_REF,
		getTranslationsFn: _getTranslations,
		isOnSalesforceSetupFn: _isOnSalesforceSetup,
		locationRef: globalThis.location ?? FALLBACK_LOCATION_REF,
		openSettingsPageFn: _openSettingsPage,
		sendExtensionMessageFn: _sendExtensionMessage,
		translationDataset: _TranslationService.TRANSLATE_DATASET,
		translationSeparator: _TranslationService.TRANSLATE_SEPARATOR,
		cmdExportAll: _CMD_EXPORT_ALL,
		cmdImport: _CMD_IMPORT,
		cmdOpenSettings: _CMD_OPEN_SETTINGS,
		cxmManageTabs: _CXM_MANAGE_TABS,
		whatExportCheck: _WHAT_EXPORT_CHECK,
		whatGetCommands: _WHAT_GET_COMMANDS,
		whatShowImport: _WHAT_SHOW_IMPORT,
		whatStartTutorial: _WHAT_START_TUTORIAL,
		hostPermissionsRedirect: HOST_PERMISSIONS_REDIRECT,
		notSalesforceSetupRedirect: NOT_SALESFORCE_SETUP_REDIRECT,
		popupButtonIds: POPUP_BUTTON_IDS,
	};
}

/**
 * Creates a popup module that can be executed later.
 *
 * @param {Object} [options={}] Popup runtime options.
 * @param {Object} [options.browser] Browser runtime.
 * @param {(...args: unknown[]) => Promise<boolean>} [options.areFramePatternsAllowedFn] Permission checker for frame patterns.
 * @param {() => void} [options.closePopupFn] Popup close callback.
 * @param {{ getElementById?: (id: string) => unknown; querySelector?: (selector: string) => unknown } | null} [options.documentRef] Document reference used by the popup.
 * @param {(messageKey: string | string[]) => Promise<string | string[]>} [options.getTranslationsFn] Translation lookup callback.
 * @param {() => Promise<{ ison: boolean }>} [options.isOnSalesforceSetupFn] Salesforce setup page checker.
 * @param {Location | { href?: string }} [options.locationRef] Location reference used for redirects.
 * @param {() => void} [options.openSettingsPageFn] Settings page opener.
 * @param {(message: Record<string, unknown>) => Promise<unknown>} [options.sendExtensionMessageFn] Extension messaging callback.
 * @param {string} [options.translationDataset] Translation dataset attribute name.
 * @param {string} [options.translationSeparator] Translation key separator.
 * @param {string} [options.cmdExportAll] Export-all command id.
 * @param {string} [options.cmdImport] Import command id.
 * @param {string} [options.cmdOpenSettings] Open-settings command id.
 * @param {string} [options.cxmManageTabs] Command id for managing tabs.
 * @param {string} [options.whatExportCheck] Message key for export permission checks.
 * @param {string} [options.whatGetCommands] Message key for command retrieval.
 * @param {string} [options.whatShowImport] Message key for showing import UI.
 * @param {string} [options.whatStartTutorial] Message key for starting tutorial.
 * @param {string} [options.hostPermissionsRedirect] Redirect path for host permissions.
 * @param {string} [options.notSalesforceSetupRedirect] Redirect path when not on Salesforce setup.
 * @param {Record<string, string>} [options.popupButtonIds] Popup button id map.
 * @param {string[] | null} [options.requestedCommands] Pre-fetched command list.
 * @return {{ runPopup: () => Promise<{ redirected: boolean }> }} Popup module API.
 */
export function createPopupModule({
	browser = FALLBACK_BROWSER,
	areFramePatternsAllowedFn = () => Promise.resolve(true),
	closePopupFn = () => {},
	documentRef = FALLBACK_DOCUMENT_REF,
	getTranslationsFn = (message) => Promise.resolve(message),
	isOnSalesforceSetupFn = () => Promise.resolve({ ison: false }),
	locationRef = FALLBACK_LOCATION_REF,
	openSettingsPageFn = () => {},
	sendExtensionMessageFn = () => Promise.resolve(undefined),
	translationDataset = "i18n",
	translationSeparator = "+-+",
	cmdExportAll = "",
	cmdImport = "",
	cmdOpenSettings = "",
	cxmManageTabs = "",
	whatExportCheck = "",
	whatGetCommands = "",
	whatShowImport = "",
	whatStartTutorial = "",
	hostPermissionsRedirect = HOST_PERMISSIONS_REDIRECT,
	notSalesforceSetupRedirect = NOT_SALESFORCE_SETUP_REDIRECT,
	popupButtonIds = POPUP_BUTTON_IDS,
	requestedCommands = null,
	...overrides
} = {}) {
	return {
		runPopup: runPopupImpl.bind(null, {
			browser,
			areFramePatternsAllowedFn,
			closePopupFn,
			documentRef,
			getTranslationsFn,
			isOnSalesforceSetupFn,
			locationRef,
			openSettingsPageFn,
			sendExtensionMessageFn,
			translationDataset,
			translationSeparator,
			cmdExportAll,
			cmdImport,
			cmdOpenSettings,
			cxmManageTabs,
			whatExportCheck,
			whatGetCommands,
			whatShowImport,
			whatStartTutorial,
			hostPermissionsRedirect,
			notSalesforceSetupRedirect,
			popupButtonIds,
			requestedCommands,
			...overrides,
		}),
	};
}

/**
 * Executes popup startup behavior with runtime defaults.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Promise<{ redirected: boolean }>} Redirect status.
 */
export function runPopup(overrides = {}) {
	return createPopupModule(overrides).runPopup();
}

/**
 * Executes popup startup behavior with fully injected options.
 *
 * @param {Object} [options={}] Fully injected popup options.
 * @return {Promise<{ redirected: boolean }>} Redirect status.
 */
export function runPopupWithInjectedOptions(options = {}) {
	return runPopupImpl(options);
}
