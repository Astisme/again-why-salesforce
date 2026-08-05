"use strict";

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
 * @param {(message: Record<string, unknown>) => Promise<unknown> | unknown} sendExtensionMessage Message dispatcher.
 * @param {() => void} closePopup Close callback.
 * @param {Record<string, unknown>} message Runtime message to send.
 * @return {Promise<void>} Resolves when the message has been sent and popup close has been requested.
 */
async function sendMessageAndClose(
	sendExtensionMessage,
	closePopup,
	message,
) {
	await sendExtensionMessage(message);
	closePopup();
}

/**
 * Builds translated shortcut text for a popup action button.
 *
 * @param {{ dataset: Record<string, string> }} button Target button.
 * @param {string} shortcut Shortcut text from command metadata.
 * @param {(message: string | string[], connector?: string) => Promise<string | string[]>} getTranslations Translator function.
 * @param {string} translationDataset Dataset key that stores translation instructions.
 * @param {string} translationSeparator Separator used in the translation dataset.
 * @return {Promise<string | string[]>} Translated shortcut text.
 */
function addShortcutText(
	button,
	shortcut,
	getTranslations,
	translationDataset,
	translationSeparator,
) {
	return getTranslations([
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
 * @param {() => Promise<boolean>} [options.areFramePatternsAllowed] Frame permission checker.
 * @param {() => void} [options.closePopup] Popup close callback.
 * @param {{ getElementById: (id: string) => {
 *   addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *   dataset: Record<string, string>;
 *   title: string;
 * } | null }} [options.documentRef] Popup document-like object.
 * @param {(message: string | string[], connector?: string) => Promise<string | string[]>} [options.getTranslations] Translation function.
 * @param {() => Promise<{ison: boolean; url?: string | null}>} [options.isOnSalesforceSetup] Salesforce setup detector.
 * @param {{ href: string }} [options.locationRef] Mutable location object for redirects.
 * @param {() => void} [options.openSettingsPage] Settings opener.
 * @param {(message: Record<string, unknown>) => Promise<unknown> | unknown} [options.sendExtensionMessage] Extension message sender.
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
	areFramePatternsAllowed = () => Promise.resolve(true),
	closePopup = () => {},
	documentRef = FALLBACK_DOCUMENT_REF,
	getTranslations = (message) => Promise.resolve(message),
	isOnSalesforceSetup = () => Promise.resolve({ ison: false }),
	locationRef = FALLBACK_LOCATION_REF,
	openSettingsPage = () => {},
	sendExtensionMessage = () => Promise.resolve(undefined),
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
	const isOnSalesforceSetupResult = await isOnSalesforceSetup();
	if (isOnSalesforceSetupResult.ison) {
		if (!(await areFramePatternsAllowed())) {
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
				sendExtensionMessage,
				closePopup,
				{ what: whatShowImport },
			),
	);
	exportBtn.addEventListener(
		"click",
		() =>
			sendMessageAndClose(
				sendExtensionMessage,
				closePopup,
				{ what: whatExportCheck },
			),
	);
	settingsBtn.addEventListener("click", openSettingsPage);
	manageTabsBtn.addEventListener(
		"click",
		() =>
			sendMessageAndClose(
				sendExtensionMessage,
				closePopup,
				{ what: cxmManageTabs },
			),
	);
	tutorialBtn.addEventListener(
		"click",
		() =>
			sendMessageAndClose(
				sendExtensionMessage,
				closePopup,
				{ what: whatStartTutorial },
			),
	);
	const availableCommands = await sendExtensionMessage({
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
					getTranslations,
					translationDataset,
					translationSeparator,
				);
				break;
			case cmdImport:
				importBtn.title = await addShortcutText(
					importBtn,
					availableCommand.shortcut,
					getTranslations,
					translationDataset,
					translationSeparator,
				);
				break;
			case cmdOpenSettings:
				settingsBtn.title = await addShortcutText(
					settingsBtn,
					availableCommand.shortcut,
					getTranslations,
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
 * Creates a popup module that can be executed later.
 *
 * @param {Object} [options={}] Popup runtime options.
 * @param {Object} [options.browser] Browser runtime.
 * @param {(...args: unknown[]) => Promise<boolean>} [options.areFramePatternsAllowed] Permission checker for frame patterns.
 * @param {() => void} [options.closePopup] Popup close callback.
 * @param {{ getElementById?: (id: string) => unknown; querySelector?: (selector: string) => unknown } | null} [options.documentRef] Document reference used by the popup.
 * @param {(messageKey: string | string[]) => Promise<string | string[]>} [options.getTranslations] Translation lookup callback.
 * @param {() => Promise<{ ison: boolean }>} [options.isOnSalesforceSetup] Salesforce setup page checker.
 * @param {Location | { href?: string }} [options.locationRef] Location reference used for redirects.
 * @param {() => void} [options.openSettingsPage] Settings page opener.
 * @param {(message: Record<string, unknown>) => Promise<unknown>} [options.sendExtensionMessage] Extension messaging callback.
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
	areFramePatternsAllowed = () => Promise.resolve(true),
	closePopup = () => {},
	documentRef = FALLBACK_DOCUMENT_REF,
	getTranslations = (message) => Promise.resolve(message),
	isOnSalesforceSetup = () => Promise.resolve({ ison: false }),
	locationRef = FALLBACK_LOCATION_REF,
	openSettingsPage = () => {},
	sendExtensionMessage = () => Promise.resolve(undefined),
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
			areFramePatternsAllowed,
			closePopup,
			documentRef,
			getTranslations,
			isOnSalesforceSetup,
			locationRef,
			openSettingsPage,
			sendExtensionMessage,
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
