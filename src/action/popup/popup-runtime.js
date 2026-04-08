"use strict";
import {
	BROWSER,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_SETTINGS,
	CXM_MANAGE_TABS,
	WHAT_EXPORT_CHECK,
	WHAT_GET_COMMANDS,
	WHAT_SHOW_IMPORT,
	WHAT_START_TUTORIAL,
} from "../../core/constants.js";
import {
	areFramePatternsAllowed,
	isOnSalesforceSetup,
	openSettingsPage,
	sendExtensionMessage,
} from "../../core/functions.js";
import { getTranslations, TranslationService } from "../../core/translator.js";

const HOST_PERMISSIONS_REDIRECT =
	"action/req_permissions/req_permissions.html?whichid=hostpermissions";
const NOT_SALESFORCE_SETUP_REDIRECT = "action/notSalesforceSetup/notSalesforceSetup.html";

const POPUP_BUTTON_IDS = {
	export: "export",
	import: "import",
	manageTabs: "manage-tabs",
	settings: "open-settings",
	tutorial: "tutorial",
};

const REQUESTED_COMMANDS = [
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_SETTINGS,
];

/**
 * @typedef {{
 *   addEventListener: (type: string, listener: () => void | Promise<void>) => void;
 *   dataset: Record<string, string>;
 *   title: string;
 * }} PopupButtonLike
 */

/**
 * @typedef {{ getElementById: (id: string) => PopupButtonLike | null }} PopupDocumentLike
 */

/**
 * @typedef {{ href: string }} PopupLocationLike
 */

/**
 * @typedef {{ runtime: { getURL: (path: string) => string } }} PopupBrowserLike
 */

/**
 * @typedef {{ name: string; shortcut: string }} PopupCommand
 */

/**
 * Returns the translation key segment before the translator separator.
 *
 * @param {string|undefined} i18n Raw `data-i18n` value from the button.
 * @param {string} separator Configured translator separator.
 * @return {string} Translation key segment.
 */
function _sliceBeforeSeparator(i18n, separator) {
	if (typeof i18n !== "string") {
		return "";
	}
	const separatorIndex = i18n.indexOf(separator);
	return separatorIndex === -1 ? i18n : i18n.slice(0, separatorIndex);
}

/**
 * Sends a popup message and closes the popup window.
 *
 * @param {(message: Record<string, unknown>) => Promise<unknown> | undefined} sendExtensionMessageFn Message dispatcher.
 * @param {() => void} closePopupFn Close callback.
 * @param {Record<string, unknown>} message Runtime message to send.
 * @return {Promise<void>} Resolves when the message has been sent and popup close has been requested.
 */
async function pop_sendMessageAndClose(
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
 * @param {PopupButtonLike} button Target button.
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
		_sliceBeforeSeparator(
			button.dataset[translationDataset],
			translationSeparator,
		),
		`(${shortcut})`,
	]);
}

/**
 * Resolves and validates required popup buttons.
 *
 * @param {PopupDocumentLike} documentRef Document-like host for popup buttons.
 * @return {{
 *   exportBtn: PopupButtonLike | null;
 *   importBtn: PopupButtonLike | null;
 *   manageTabsBtn: PopupButtonLike | null;
 *   settingsBtn: PopupButtonLike | null;
 *   tutorialBtn: PopupButtonLike | null;
 * }} Popup buttons.
 */
function getPopupButtons(documentRef) {
	return {
		exportBtn: documentRef.getElementById(POPUP_BUTTON_IDS.export),
		importBtn: documentRef.getElementById(POPUP_BUTTON_IDS.import),
		manageTabsBtn: documentRef.getElementById(POPUP_BUTTON_IDS.manageTabs),
		settingsBtn: documentRef.getElementById(POPUP_BUTTON_IDS.settings),
		tutorialBtn: documentRef.getElementById(POPUP_BUTTON_IDS.tutorial),
	};
}

/**
 * Executes popup startup behavior with injectable dependencies.
 *
 * @param {Object} [options={}] Runtime overrides used by tests.
 * @param {PopupBrowserLike} [options.browser=BROWSER] Browser API object.
 * @param {() => Promise<boolean>} [options.areFramePatternsAllowedFn=areFramePatternsAllowed] Frame permission checker.
 * @param {() => void} [options.closePopupFn=close] Popup close callback.
 * @param {PopupDocumentLike} [options.documentRef=document] Popup document-like object.
 * @param {(message: string | string[], connector?: string) => Promise<string | string[]>} [options.getTranslationsFn=getTranslations] Translation function.
 * @param {() => Promise<{ison: boolean; url?: string | null}>} [options.isOnSalesforceSetupFn=isOnSalesforceSetup] Salesforce setup detector.
 * @param {PopupLocationLike} [options.locationRef=globalThis.location] Mutable location object for redirects.
 * @param {() => void} [options.openSettingsPageFn=openSettingsPage] Settings opener.
 * @param {(message: Record<string, unknown>) => Promise<PopupCommand[] | unknown> | undefined} [options.sendExtensionMessageFn=sendExtensionMessage] Extension message sender.
 * @param {string} [options.translationDataset=TranslationService.TRANSLATE_DATASET] Dataset key for translation attributes.
 * @param {string} [options.translationSeparator=TranslationService.TRANSLATE_SEPARATOR] Separator in translation attributes.
 * @return {Promise<{ redirected: boolean }>} Redirect status.
 */
export async function runPopup({
	browser = BROWSER,
	areFramePatternsAllowedFn = areFramePatternsAllowed,
	closePopupFn = close,
	documentRef = document,
	getTranslationsFn = getTranslations,
	isOnSalesforceSetupFn = isOnSalesforceSetup,
	locationRef = globalThis.location,
	openSettingsPageFn = openSettingsPage,
	sendExtensionMessageFn = sendExtensionMessage,
	translationDataset = TranslationService.TRANSLATE_DATASET,
	translationSeparator = TranslationService.TRANSLATE_SEPARATOR,
} = {}) {
	const isonSFsetup = await isOnSalesforceSetupFn();
	if (isonSFsetup.ison) {
		if (!(await areFramePatternsAllowedFn())) {
			locationRef.href = browser.runtime.getURL(HOST_PERMISSIONS_REDIRECT);
			return { redirected: true };
		}
	} else {
		locationRef.href = browser.runtime.getURL(
			`${NOT_SALESFORCE_SETUP_REDIRECT}${
				isonSFsetup.url == null ? "" : `?url=${isonSFsetup.url}`
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
	} = getPopupButtons(documentRef);
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
			pop_sendMessageAndClose(
				sendExtensionMessageFn,
				closePopupFn,
				{ what: WHAT_SHOW_IMPORT },
			),
	);
	exportBtn.addEventListener(
		"click",
		() =>
			pop_sendMessageAndClose(
				sendExtensionMessageFn,
				closePopupFn,
				{ what: WHAT_EXPORT_CHECK },
			),
	);
	settingsBtn.addEventListener(
		"click",
		openSettingsPageFn,
	);
	manageTabsBtn.addEventListener(
		"click",
		() =>
			pop_sendMessageAndClose(
				sendExtensionMessageFn,
				closePopupFn,
				{ what: CXM_MANAGE_TABS },
			),
	);
	tutorialBtn.addEventListener(
		"click",
		() =>
			pop_sendMessageAndClose(
				sendExtensionMessageFn,
				closePopupFn,
				{ what: WHAT_START_TUTORIAL },
			),
	);
	const availableCommands = await sendExtensionMessageFn({
		what: WHAT_GET_COMMANDS,
		commands: REQUESTED_COMMANDS,
	});
	if (!Array.isArray(availableCommands)) {
		return { redirected: false };
	}
	for (const availableCommand of availableCommands) {
		switch (availableCommand.name) {
			case CMD_EXPORT_ALL:
				exportBtn.title = await addShortcutText(
					exportBtn,
					availableCommand.shortcut,
					getTranslationsFn,
					translationDataset,
					translationSeparator,
				);
				break;
			case CMD_IMPORT:
				importBtn.title = await addShortcutText(
					importBtn,
					availableCommand.shortcut,
					getTranslationsFn,
					translationDataset,
					translationSeparator,
				);
				break;
			case CMD_OPEN_SETTINGS:
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
